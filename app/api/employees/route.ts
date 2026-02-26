// 변경: 자동 할당 전체를 prisma.$transaction 안에서 실행 — 중간 실패 시 불일치 상태 방지

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/employees — 조직원 목록 조회
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const employees = await prisma.employee.findMany({
      include: {
        assignments: {
          where: { returnedDate: null },
          include: { license: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = employees.map((emp) => ({
      ...emp,
      activeAssignments: emp.assignments.length,
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
  try {
    const body = await request.json();
    const { name, department, email } = body;

    if (!name || !department) {
      return NextResponse.json(
        { error: "name, department는 필수입니다." },
        { status: 400 }
      );
    }

    // employee 생성과 자동 할당 전체를 트랜잭션으로 묶어 불일치 방지
    const autoAssigned: { licenseId: number; licenseName: string; groupName: string }[] = [];

    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          name,
          department,
          email: email || null,
        },
      });

      // Auto-assign licenses from default groups
      const defaultGroups = await tx.licenseGroup.findMany({
        where: { isDefault: true },
        include: { members: { include: { license: true } } },
      });

      for (const group of defaultGroups) {
        for (const member of group.members) {
          const license = member.license;
          const activeCount = await tx.assignment.count({
            where: { licenseId: license.id, returnedDate: null },
          });

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

      return emp;
    });

    return NextResponse.json({ ...employee, autoAssigned }, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create employee:", error);
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "조직원 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
