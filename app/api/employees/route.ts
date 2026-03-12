// 변경: 자동 할당 전체를 prisma.$transaction 안에서 실행 — 중간 실패 시 불일치 상태 방지

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { ValidationError, handleValidationError, handlePrismaError, vStrReq, vStr, vNum, vEmail } from "@/lib/validation";

// GET /api/employees — 조직원 목록 조회
// Query: ?orgUnitId=1&status=ACTIVE&unassigned=true
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgUnitId = searchParams.get("orgUnitId");
    const status = searchParams.get("status");
    const unassigned = searchParams.get("unassigned");

    const where: Record<string, unknown> = {};
    if (orgUnitId) where.orgUnitId = Number(orgUnitId);
    if (status === "ACTIVE" || status === "OFFBOARDING") where.status = status;
    if (unassigned === "true") {
      where.assignments = { none: { returnedDate: null } };
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        orgUnit: { select: { id: true, name: true } },
        assignments: {
          where: { returnedDate: null },
          include: { license: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = employees.map((emp) => ({
      ...emp,
      activeAssignmentCount: emp.assignments.length,
      assignments: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json(
      { error: "조직원 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/employees — 조직원 등록
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  try {
    const body = await request.json();

    // ── 입력 검증 ──
    const nameVal = vStrReq(body.name, "이름", 100);
    const departmentVal = vStr(body.department, 100);  // deprecated → optional
    const emailVal = vEmail(body.email);
    const titleVal = vStr(body.title, 100);
    const companyIdVal = vNum(body.companyId, { min: 1, integer: true });
    const orgUnitIdVal = vNum(body.orgUnitId, { min: 1, integer: true });

    // employee 생성과 자동 할당 전체를 트랜잭션으로 묶어 불일치 방지
    const autoAssigned: { licenseId: number; licenseName: string; groupName: string }[] = [];

    const employee = await prisma.$transaction(async (tx) => {
      // FK 존재 검증
      if (companyIdVal) {
        const company = await tx.orgCompany.findUnique({ where: { id: companyIdVal }, select: { id: true } });
        if (!company) throw new ValidationError("존재하지 않는 회사입니다.");
      }
      if (orgUnitIdVal) {
        const org = await tx.orgUnit.findUnique({ where: { id: orgUnitIdVal }, select: { id: true } });
        if (!org) throw new ValidationError("존재하지 않는 조직입니다.");
      }

      const emp = await tx.employee.create({
        data: {
          name: nameVal,
          department: departmentVal,
          email: emailVal,
          title: titleVal,
          companyId: companyIdVal,
          orgUnitId: orgUnitIdVal,
        },
      });

      // Auto-assign licenses from default groups
      const defaultGroups = await tx.licenseGroup.findMany({
        where: { isDefault: true },
        include: { members: { include: { license: true } } },
      });

      // ── N+1 쿼리 개선: 모든 라이선스의 활성 배정 수를 한 번에 조회 ──
      const allLicenseIds = defaultGroups.flatMap(g => g.members.map(m => m.licenseId));
      const activeCountsRaw = allLicenseIds.length > 0
        ? await tx.assignment.groupBy({
            by: ["licenseId"],
            where: { licenseId: { in: allLicenseIds }, returnedDate: null },
            _count: { id: true },
          })
        : [];
      const activeCounts = new Map(activeCountsRaw.map(r => [r.licenseId, r._count.id]));

      for (const group of defaultGroups) {
        for (const member of group.members) {
          const license = member.license;
          const activeCount = activeCounts.get(license.id) ?? 0;

          // KEY_BASED: max 1 auto-assignment; VOLUME/NO_KEY: check total quantity
          if (license.licenseType === "KEY_BASED" && activeCount >= 1) continue;
          if (license.licenseType !== "KEY_BASED" && activeCount >= license.totalQuantity) continue;

          const keyType = license.licenseType === "VOLUME" ? "Volume Key" : license.licenseType === "KEY_BASED" ? "Individual Key" : "No Key";
          const reason = `Auto-assigned via Group: ${group.name} (${keyType})`;
          const assignment = await tx.assignment.create({
            data: {
              licenseId: license.id,
              employeeId: emp.id,
              reason,
            },
          });

          await tx.assignmentHistory.create({
            data: {
              assignmentId: assignment.id,
              licenseId: license.id,
              employeeId: emp.id,
              action: "ASSIGNED",
              reason,
            },
          });

          autoAssigned.push({
            licenseId: license.id,
            licenseName: license.name,
            groupName: group.name,
          });
        }
      }

      await writeAuditLog(tx, {
        entityType: "EMPLOYEE",
        entityId: emp.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: emp.name, department: emp.department, email: emp.email },
      });

      // orgUnit을 포함해서 반환
      return tx.employee.findUnique({
        where: { id: emp.id },
        include: { orgUnit: { select: { id: true, name: true } } },
      });
    });

    return NextResponse.json({ ...employee, autoAssigned }, { status: 201 });
  } catch (error: unknown) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error, { uniqueMessage: "이미 등록된 이메일입니다." });
    if (pErr) return pErr;
    console.error("Failed to create employee:", error);
    return NextResponse.json(
      { error: "조직원 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
