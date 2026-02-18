"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import type { ImportType, ImportResult, RowError } from "@/lib/csv-import";
import { parseDate, parseBoolean, requireField, parseNumber } from "@/lib/csv-import";
import { generateTemplateCsv } from "./templates";
import { templates } from "./templates";
import { syncSeats } from "@/lib/license-seats";

// ─── Public Server Actions ─────────────────────────────────────────────

export async function getTemplateCsv(type: ImportType): Promise<string> {
  return generateTemplateCsv(type);
}

export async function importCsv(formData: FormData): Promise<ImportResult> {
  const type = formData.get("type") as ImportType | null;
  const file = formData.get("file") as File | null;

  if (!type || !["licenses", "employees", "groups", "assignments", "seats"].includes(type)) {
    return { success: false, created: 0, updated: 0, errors: [], message: "가져오기 유형을 선택하세요." };
  }
  if (!file || file.size === 0) {
    return { success: false, created: 0, updated: 0, errors: [], message: "CSV 파일을 선택하세요." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, created: 0, updated: 0, errors: [], message: "파일 크기가 5MB를 초과합니다." };
  }
  if (!file.name.endsWith(".csv")) {
    return { success: false, created: 0, updated: 0, errors: [], message: "CSV 파일만 업로드 가능합니다." };
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ""),
  });

  if (!parsed.data || parsed.data.length === 0) {
    return { success: false, created: 0, updated: 0, errors: [], message: "CSV 파일에 데이터가 없습니다." };
  }

  // Validate required headers
  const template = templates[type];
  const requiredHeaders = getRequiredHeaders(type);
  const actualHeaders = parsed.meta.fields ?? [];
  const missingHeaders = requiredHeaders.filter((h) => !actualHeaders.includes(h));
  if (missingHeaders.length > 0) {
    return {
      success: false,
      created: 0,
      updated: 0,
      errors: [],
      message: `필수 헤더가 없습니다: ${missingHeaders.join(", ")} (필요한 헤더: ${template.headers.join(", ")})`,
    };
  }

  try {
    switch (type) {
      case "licenses":
        return await importLicenses(parsed.data);
      case "employees":
        return await importEmployees(parsed.data);
      case "groups":
        return await importGroups(parsed.data);
      case "assignments":
        return await importAssignments(parsed.data);
      case "seats":
        return await importSeats(parsed.data);
    }
  } catch (error) {
    return {
      success: false,
      created: 0,
      updated: 0,
      errors: [],
      message: error instanceof Error ? error.message : "가져오기 처리 중 오류가 발생했습니다.",
    };
  }
}

function getRequiredHeaders(type: ImportType): string[] {
  switch (type) {
    case "licenses":
      return ["name", "totalQuantity", "purchaseDate"];
    case "employees":
      return ["name", "department"];
    case "groups":
      return ["name"];
    case "assignments":
      return ["licenseName", "employeeEmail"];
    case "seats":
      return ["licenseName", "key"];
  }
}

// ─── License Import ────────────────────────────────────────────────────

async function importLicenses(rows: Record<string, string>[]): Promise<ImportResult> {
  const errors: RowError[] = [];

  // Phase 1: 필드 파싱 & 기본 검증
  const validated = rows.map((row, i) => {
    const rowNum = i + 2; // 1-indexed + header
    const name = requireField(row.name, rowNum, "name", errors);
    const totalQuantity = parseNumber(row.totalQuantity, rowNum, "totalQuantity", errors, true);
    const purchaseDate = parseDate(row.purchaseDate, rowNum, "purchaseDate", errors, true);
    const key = row.key?.trim() || null;
    const isVolumeLicense = parseBoolean(row.isVolumeLicense, rowNum, "isVolumeLicense", errors);
    const price = parseNumber(row.price, rowNum, "price", errors);
    const expiryDate = parseDate(row.expiryDate, rowNum, "expiryDate", errors);
    const contractDate = parseDate(row.contractDate, rowNum, "contractDate", errors);
    const noticePeriodDays = parseNumber(row.noticePeriodDays, rowNum, "noticePeriodDays", errors);
    const adminName = row.adminName?.trim() || null;
    const description = row.description?.trim() || null;

    return {
      rowNum, name, totalQuantity, purchaseDate, key, isVolumeLicense,
      price, expiryDate, contractDate, noticePeriodDays, adminName, description,
    };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  // Phase 1.5: 키 중복 검사 (CSV 내부)
  const keysInCsv = new Map<string, number>(); // key → first rowNum
  for (const row of validated) {
    if (row.key) {
      const prev = keysInCsv.get(row.key);
      if (prev !== undefined) {
        errors.push({ row: row.rowNum, column: "key", message: `CSV 내 키 중복: "${row.key}" (행 ${prev}과 중복)` });
      } else {
        keysInCsv.set(row.key, row.rowNum);
      }
    }
  }

  // Phase 1.5: 키 중복 검사 (DB — 다른 이름의 라이선스)
  const csvKeys = [...keysInCsv.keys()];
  if (csvKeys.length > 0) {
    const dbLicensesWithKeys = await prisma.license.findMany({
      where: { key: { in: csvKeys } },
      select: { name: true, key: true },
    });
    const csvNameSet = new Set(validated.map((r) => r.name));
    for (const dbLicense of dbLicensesWithKeys) {
      if (dbLicense.key && !csvNameSet.has(dbLicense.name)) {
        const conflictRow = keysInCsv.get(dbLicense.key);
        if (conflictRow !== undefined) {
          errors.push({
            row: conflictRow,
            column: "key",
            message: `키 "${dbLicense.key}"이(가) 이미 다른 라이선스 "${dbLicense.name}"에 등록되어 있습니다.`,
          });
        }
      }
    }
  }

  // Phase 1.5: 기존 라이선스의 수량 축소 사전 검증
  //   - 활성 배정 수 이상으로만 수량 변경 가능
  //   - 개별 라이선스: 배정 중인 시트 수 이상으로만 수량 변경 가능
  const uniqueNames = [...new Set(validated.map((r) => r.name).filter(Boolean))] as string[];
  if (uniqueNames.length > 0) {
    const existingLicenses = await prisma.license.findMany({
      where: { name: { in: uniqueNames } },
      include: {
        seats: {
          include: {
            assignments: {
              where: { returnedDate: null },
              select: { id: true },
            },
          },
        },
        _count: {
          select: { assignments: { where: { returnedDate: null } } },
        },
      },
    });

    const licenseMap = new Map(existingLicenses.map((l) => [l.name, l]));

    for (const row of validated) {
      if (!row.name || row.totalQuantity == null) continue;
      const existing = licenseMap.get(row.name);
      if (!existing) continue;

      const isVolume = row.isVolumeLicense ?? existing.isVolumeLicense;
      const activeAssignments = existing._count.assignments;

      if (isVolume) {
        // 볼륨: 활성 배정 수 이상이어야
        if (row.totalQuantity < activeAssignments) {
          errors.push({
            row: row.rowNum,
            column: "totalQuantity",
            message: `현재 활성 배정 ${activeAssignments}건이 있어 수량을 ${activeAssignments} 미만으로 설정할 수 없습니다. (입력값: ${row.totalQuantity})`,
          });
        }
      } else {
        // 개별: 배정 중인 시트 수 이상이어야
        const assignedSeatCount = existing.seats.filter(
          (s) => s.assignments.length > 0
        ).length;
        if (assignedSeatCount > 0 && row.totalQuantity < assignedSeatCount) {
          errors.push({
            row: row.rowNum,
            column: "totalQuantity",
            message: `현재 ${assignedSeatCount}개 시트가 배정 중이어서 수량을 ${assignedSeatCount} 미만으로 줄일 수 없습니다. (입력값: ${row.totalQuantity})`,
          });
        }
      }
    }
  }

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  // Phase 2: 트랜잭션 실행
  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of validated) {
      const isVolume = row.isVolumeLicense ?? false;
      const data = {
        name: row.name!,
        totalQuantity: row.totalQuantity!,
        purchaseDate: row.purchaseDate!,
        key: isVolume ? row.key : null, // 개별 라이선스는 키를 시트에 저장
        isVolumeLicense: isVolume,
        price: row.price,
        expiryDate: row.expiryDate,
        contractDate: row.contractDate,
        noticePeriodDays: row.noticePeriodDays ? Math.round(row.noticePeriodDays) : null,
        adminName: row.adminName,
        description: row.description,
      };

      const existing = await tx.license.findFirst({ where: { name: row.name! } });
      if (existing) {
        await tx.license.update({ where: { id: existing.id }, data });
        if (!isVolume) {
          await syncSeats(tx, existing.id, data.totalQuantity);
        }
        updated++;
      } else {
        const license = await tx.license.create({ data });
        if (!isVolume) {
          await syncSeats(tx, license.id, data.totalQuantity);
        }
        created++;
      }
    }
  });

  revalidatePath("/licenses");
  return { success: true, created, updated, errors: [] };
}

// ─── Employee Import ───────────────────────────────────────────────────

async function importEmployees(rows: Record<string, string>[]): Promise<ImportResult> {
  const errors: RowError[] = [];

  const validated = rows.map((row, i) => {
    const rowNum = i + 2;
    const name = requireField(row.name, rowNum, "name", errors);
    const department = requireField(row.department, rowNum, "department", errors);
    const email = row.email?.trim() || null;
    const groupName = row.groupName?.trim() || null;
    return { name, department, email, groupName, rowNum };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  // Phase 1.5: Validate group names exist in DB before writing
  const uniqueGroupNames = [...new Set(validated.map((r) => r.groupName).filter(Boolean))] as string[];
  if (uniqueGroupNames.length > 0) {
    const existingGroups = await prisma.licenseGroup.findMany({
      where: { name: { in: uniqueGroupNames } },
      select: { name: true },
    });
    const existingSet = new Set(existingGroups.map((g) => g.name));
    for (const row of validated) {
      if (row.groupName && !existingSet.has(row.groupName)) {
        errors.push({ row: row.rowNum, column: "groupName", message: `존재하지 않는 그룹입니다: "${row.groupName}"` });
      }
    }
    if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };
  }

  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of validated) {
      const employeeData = {
        name: row.name!,
        department: row.department!,
        email: row.email || null,
      };

      let employee;
      if (row.email) {
        const existing = await tx.employee.findUnique({ where: { email: row.email } });
        if (existing) {
          employee = await tx.employee.update({ where: { id: existing.id }, data: employeeData });
          updated++;
        } else {
          employee = await tx.employee.create({ data: employeeData });
          created++;
        }
      } else {
        employee = await tx.employee.create({ data: employeeData });
        created++;
      }

      // Auto-assign group licenses if groupName is provided
      if (row.groupName) {
        const group = await tx.licenseGroup.findUnique({
          where: { name: row.groupName },
          include: { members: { include: { license: true } } },
        });

        if (!group) {
          throw new Error(`그룹 "${row.groupName}"을(를) 찾을 수 없습니다.`);
        }

        for (const member of group.members) {
          const license = member.license;
          const activeAssignments = await tx.assignment.findMany({
            where: { licenseId: license.id, returnedDate: null },
            select: { employeeId: true },
          });

          // Skip if already assigned to this employee
          if (activeAssignments.some((a) => a.employeeId === employee.id)) continue;

          let seatId: number | null = null;

          if (!license.isVolumeLicense) {
            // 개별 라이선스: 빈 시트 찾기 (키 있는 시트 우선)
            const availableSeats = await tx.licenseSeat.findMany({
              where: {
                licenseId: license.id,
                assignments: { none: { returnedDate: null } },
              },
              orderBy: { id: "asc" },
            });
            const sorted = [
              ...availableSeats.filter((s) => s.key !== null),
              ...availableSeats.filter((s) => s.key === null),
            ];
            if (sorted.length === 0) continue; // 빈 시트 없으면 건너뜀
            seatId = sorted[0].id;
          } else {
            // 볼륨 라이선스: 수량 체크
            if (activeAssignments.length >= license.totalQuantity) continue;
          }

          const keyType = license.isVolumeLicense ? "Volume Key" : "Individual Key";
          const reason = `CSV Import - Auto-assigned via Group: ${group.name} (${keyType})`;
          const assignment = await tx.assignment.create({
            data: { licenseId: license.id, employeeId: employee.id, seatId, reason },
          });
          await tx.assignmentHistory.create({
            data: {
              assignmentId: assignment.id,
              licenseId: license.id,
              employeeId: employee.id,
              action: "ASSIGNED",
              reason,
            },
          });
        }
      }
    }
  });

  revalidatePath("/employees");
  revalidatePath("/licenses");
  return { success: true, created, updated, errors: [] };
}

// ─── Group Import ──────────────────────────────────────────────────────

async function importGroups(rows: Record<string, string>[]): Promise<ImportResult> {
  const errors: RowError[] = [];

  const validated = rows.map((row, i) => {
    const rowNum = i + 2;
    const name = requireField(row.name, rowNum, "name", errors);
    const description = row.description?.trim() || null;
    const isDefault = parseBoolean(row.isDefault, rowNum, "isDefault", errors);
    const licenseNames = row.licenseNames?.trim()
      ? row.licenseNames.split(";").map((n) => n.trim()).filter(Boolean)
      : [];
    return { name, description, isDefault, licenseNames };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of validated) {
      const groupData = {
        name: row.name!,
        description: row.description,
        isDefault: row.isDefault ?? false,
      };

      const existing = await tx.licenseGroup.findUnique({ where: { name: row.name! } });
      let groupId: number;

      if (existing) {
        await tx.licenseGroup.update({ where: { id: existing.id }, data: groupData });
        groupId = existing.id;
        updated++;
      } else {
        const newGroup = await tx.licenseGroup.create({ data: groupData });
        groupId = newGroup.id;
        created++;
      }

      // Sync license members if licenseNames provided
      if (row.licenseNames.length > 0) {
        // Resolve license IDs
        const licenseIds: number[] = [];
        for (const licenseName of row.licenseNames) {
          const license = await tx.license.findFirst({ where: { name: licenseName } });
          if (!license) {
            throw new Error(`그룹 "${row.name}"의 라이선스 "${licenseName}"을(를) 찾을 수 없습니다.`);
          }
          licenseIds.push(license.id);
        }

        // Delete existing members and recreate
        await tx.licenseGroupMember.deleteMany({ where: { licenseGroupId: groupId } });
        await tx.licenseGroupMember.createMany({
          data: licenseIds.map((licenseId) => ({ licenseGroupId: groupId, licenseId })),
        });
      }
    }
  });

  revalidatePath("/settings/groups");
  return { success: true, created, updated, errors: [] };
}

// ─── Assignment Import ─────────────────────────────────────────────────

async function importAssignments(rows: Record<string, string>[]): Promise<ImportResult> {
  const errors: RowError[] = [];

  const validated = rows.map((row, i) => {
    const rowNum = i + 2;
    const licenseName = requireField(row.licenseName, rowNum, "licenseName", errors);
    const employeeEmail = requireField(row.employeeEmail, rowNum, "employeeEmail", errors);
    const assignedDate = parseDate(row.assignedDate, rowNum, "assignedDate", errors);
    const reason = row.reason?.trim() || null;
    return { licenseName, employeeEmail, assignedDate, reason };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  let created = 0;

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < validated.length; i++) {
      const row = validated[i];
      const rowNum = i + 2;

      // Resolve license
      const license = await tx.license.findFirst({ where: { name: row.licenseName! } });
      if (!license) {
        throw new Error(`행 ${rowNum}: 라이선스 "${row.licenseName}"을(를) 찾을 수 없습니다.`);
      }

      // Resolve employee
      const employee = await tx.employee.findUnique({ where: { email: row.employeeEmail! } });
      if (!employee) {
        throw new Error(`행 ${rowNum}: 이메일 "${row.employeeEmail}"의 조직원을 찾을 수 없습니다.`);
      }

      // Check for duplicate active assignment
      const existing = await tx.assignment.findFirst({
        where: { licenseId: license.id, employeeId: employee.id, returnedDate: null },
      });
      if (existing) {
        throw new Error(
          `행 ${rowNum}: "${row.licenseName}"이(가) 이미 "${employee.name}"에게 배정되어 있습니다.`
        );
      }

      // Check capacity & find seat
      let seatId: number | null = null;
      const reason = row.reason || "CSV Import";

      if (!license.isVolumeLicense) {
        // 개별 라이선스: 빈 시트 찾기 (키 있는 시트 우선)
        const availableSeats = await tx.licenseSeat.findMany({
          where: {
            licenseId: license.id,
            assignments: { none: { returnedDate: null } },
          },
          orderBy: { id: "asc" },
        });
        const sorted = [
          ...availableSeats.filter((s) => s.key !== null),
          ...availableSeats.filter((s) => s.key === null),
        ];
        if (sorted.length === 0) {
          const totalSeats = await tx.licenseSeat.count({ where: { licenseId: license.id } });
          throw new Error(
            `행 ${rowNum}: 개별 라이선스 "${row.licenseName}"의 잔여 시트가 없습니다. (전체 ${totalSeats}개 모두 배정 중)`
          );
        }
        seatId = sorted[0].id;
      } else {
        // 볼륨 라이선스: 수량 체크
        const activeCount = await tx.assignment.count({
          where: { licenseId: license.id, returnedDate: null },
        });
        if (activeCount >= license.totalQuantity) {
          throw new Error(
            `행 ${rowNum}: 볼륨 라이선스 "${row.licenseName}"의 잔여 수량이 없습니다. (${activeCount}/${license.totalQuantity} 배정 중)`
          );
        }
      }

      const assignment = await tx.assignment.create({
        data: {
          licenseId: license.id,
          employeeId: employee.id,
          seatId,
          assignedDate: row.assignedDate ?? new Date(),
          reason,
        },
      });

      await tx.assignmentHistory.create({
        data: {
          assignmentId: assignment.id,
          licenseId: license.id,
          employeeId: employee.id,
          action: "ASSIGNED",
          reason,
        },
      });

      created++;
    }
  });

  revalidatePath("/licenses");
  revalidatePath("/employees");
  return { success: true, created, updated: 0, errors: [] };
}

// ─── Seats (Key) Import ─────────────────────────────────────────────
//
// 설계 원칙:
//   1. 모든 검증을 트랜잭션 전에 수행 → 에러 시 행 번호 포함 errors[] 반환
//   2. 트랜잭션은 검증 통과 후 쓰기만 담당 → DB Lock 최소화
//   3. 행 번호 기반 에러 메시지로 사용자가 CSV 원본에서 문제 위치를 즉시 파악

async function importSeats(rows: Record<string, string>[]): Promise<ImportResult> {
  const errors: RowError[] = [];

  // ── Phase 1: 필드 파싱 ─────────────────────────────────────────────
  const validated = rows.map((row, i) => {
    const rowNum = i + 2;
    const licenseName = requireField(row.licenseName, rowNum, "licenseName", errors);
    const key = requireField(row.key, rowNum, "key", errors);
    return { licenseName, key, rowNum };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  // ── Phase 2: 키 중복 검사 (CSV 내부) ───────────────────────────────
  const keysInCsv = new Map<string, number>(); // key → first rowNum
  for (const row of validated) {
    if (row.key) {
      const prev = keysInCsv.get(row.key);
      if (prev !== undefined) {
        errors.push({
          row: row.rowNum,
          column: "key",
          message: `CSV 내 키 중복: "${row.key}" (행 ${prev}에서 처음 등장)`,
        });
      } else {
        keysInCsv.set(row.key, row.rowNum);
      }
    }
  }

  // ── Phase 3: 키 중복 검사 (DB 기존 LicenseSeat) ────────────────────
  const csvKeys = [...keysInCsv.keys()];
  if (csvKeys.length > 0) {
    const dbSeats = await prisma.licenseSeat.findMany({
      where: { key: { in: csvKeys } },
      select: { key: true, license: { select: { name: true } } },
    });
    for (const dbSeat of dbSeats) {
      if (dbSeat.key) {
        const conflictRow = keysInCsv.get(dbSeat.key);
        if (conflictRow !== undefined) {
          errors.push({
            row: conflictRow,
            column: "key",
            message: `키 "${dbSeat.key}"이(가) 이미 라이선스 "${dbSeat.license.name}"의 시트에 등록되어 있습니다.`,
          });
        }
      }
    }
  }

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  // ── Phase 4: 라이선스별 그룹화 ─────────────────────────────────────
  const byLicense = new Map<string, { key: string; rowNum: number }[]>();
  for (const row of validated) {
    if (!row.licenseName || !row.key) continue;
    const list = byLicense.get(row.licenseName) ?? [];
    list.push({ key: row.key, rowNum: row.rowNum });
    byLicense.set(row.licenseName, list);
  }

  // ── Phase 5: 라이선스 존재·유형·빈시트 사전 검증 ───────────────────
  //
  // 트랜잭션 전에 수행하여:
  //   - 라이선스 미존재 → 해당 행 번호 에러
  //   - 볼륨 라이선스 → 해당 행 전체에 에러
  //   - 빈 시트 부족 → 초과 시작 행 번호 + 수량 정보 에러
  for (const [licenseName, keys] of byLicense) {
    const license = await prisma.license.findFirst({
      where: { name: licenseName },
      select: { id: true, isVolumeLicense: true, totalQuantity: true },
    });

    if (!license) {
      for (const k of keys) {
        errors.push({
          row: k.rowNum,
          column: "licenseName",
          message: `라이선스 "${licenseName}"을(를) 찾을 수 없습니다.`,
        });
      }
      continue;
    }

    if (license.isVolumeLicense) {
      for (const k of keys) {
        errors.push({
          row: k.rowNum,
          column: "licenseName",
          message: `"${licenseName}"은(는) 볼륨 라이선스입니다. 시트(키) 가져오기는 개별 라이선스만 지원합니다.`,
        });
      }
      continue;
    }

    const emptySeatsCount = await prisma.licenseSeat.count({
      where: { licenseId: license.id, key: null },
    });

    if (emptySeatsCount < keys.length) {
      // 초과하는 첫 번째 행부터 끝까지 에러 표시
      for (let i = emptySeatsCount; i < keys.length; i++) {
        errors.push({
          row: keys[i].rowNum,
          column: "key",
          message: `"${licenseName}": 빈 시트 ${emptySeatsCount}개 중 ${i + 1}번째 키 — 할당할 빈 시트가 없습니다. (총 ${keys.length}개 요청, 빈 시트 ${emptySeatsCount}개)`,
        });
      }
    }
  }

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  // ── Phase 6: 트랜잭션 실행 (쓰기만) ────────────────────────────────
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const [licenseName, keys] of byLicense) {
      const license = await tx.license.findFirst({ where: { name: licenseName } });
      if (!license) continue; // Phase 5에서 이미 검증 완료

      const emptySeats = await tx.licenseSeat.findMany({
        where: { licenseId: license.id, key: null },
        orderBy: { id: "asc" },
      });

      for (let i = 0; i < keys.length; i++) {
        await tx.licenseSeat.update({
          where: { id: emptySeats[i].id },
          data: { key: keys[i].key },
        });
        updated++;
      }
    }
  });

  revalidatePath("/licenses");
  return { success: true, created: 0, updated, errors: [] };
}
