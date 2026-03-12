import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { ValidationError, handleValidationError, handlePrismaError, vStr, vStrReq, vNum, vEmail } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// GET /api/employees/:id — 조직원 상세 조회
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id: Number(id) },
      include: {
        orgUnit: { select: { id: true, name: true } },
        assignments: {
          include: { license: true },
          orderBy: { assignedDate: "desc" },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "조직원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Failed to fetch employee:", error);
    return NextResponse.json(
      { error: "조직원 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/employees/:id — 기본 정보 수정 { name, department, email, title }
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  try {
    const { id } = await params;
    const body = await request.json();

    // ── 입력 검증 (department는 deprecated → optional) ──
    const nameVal = body.name !== undefined ? vStrReq(body.name, "이름", 100) : undefined;
    const departmentVal = body.department !== undefined ? vStr(body.department, 100) : undefined;
    const emailVal = body.email !== undefined ? vEmail(body.email) : undefined;
    const titleVal = body.title !== undefined ? vStr(body.title, 100) : undefined;

    const employee = await prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { id: Number(id) },
        data: {
          ...(nameVal !== undefined && { name: nameVal }),
          ...(departmentVal !== undefined && { department: departmentVal }),
          ...(emailVal !== undefined && { email: emailVal }),
          ...(titleVal !== undefined && { title: titleVal }),
        },
        include: { orgUnit: { select: { id: true, name: true } } },
      });

      await writeAuditLog(tx, {
        entityType: "EMPLOYEE",
        entityId: updated.id,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: updated.name },
      });

      return updated;
    });

    return NextResponse.json(employee);
  } catch (error) {
    const vErr0 = handleValidationError(error);
    if (vErr0) return vErr0;
    const pErr0 = handlePrismaError(error);
    if (pErr0) return pErr0;
    console.error("Failed to update employee:", error);
    return NextResponse.json(
      { error: "조직원 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PATCH /api/employees/:id — 조직 배치 변경 { companyId?, orgUnitId?, title? }
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  try {
    const { id } = await params;
    const employeeId = Number(id);
    const body = await request.json();

    // ── 입력 검증 ──
    const titleVal = body.title !== undefined ? vStr(body.title, 100) : undefined;
    const companyIdVal = body.companyId !== undefined
      ? (body.companyId ? vNum(body.companyId, { min: 1, integer: true }) : null)
      : undefined;
    const orgUnitIdVal = body.orgUnitId !== undefined
      ? (body.orgUnitId ? vNum(body.orgUnitId, { min: 1, integer: true }) : null)
      : undefined;

    const employee = await prisma.$transaction(async (tx) => {
      // FK 존재 검증
      if (companyIdVal !== undefined && companyIdVal !== null) {
        const company = await tx.orgCompany.findUnique({ where: { id: companyIdVal }, select: { id: true } });
        if (!company) throw new ValidationError("존재하지 않는 회사입니다.");
      }
      if (orgUnitIdVal !== undefined && orgUnitIdVal !== null) {
        const org = await tx.orgUnit.findUnique({ where: { id: orgUnitIdVal }, select: { id: true } });
        if (!org) throw new ValidationError("존재하지 않는 조직입니다.");
      }

      const before = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { orgUnitId: true },
      });

      const updated = await tx.employee.update({
        where: { id: employeeId },
        data: {
          ...(titleVal !== undefined && { title: titleVal }),
          ...(companyIdVal !== undefined && { companyId: companyIdVal }),
          ...(orgUnitIdVal !== undefined && { orgUnitId: orgUnitIdVal }),
        },
      });

      if (orgUnitIdVal !== undefined && before?.orgUnitId !== updated.orgUnitId) {
        await writeAuditLog(tx, {
          entityType: "EMPLOYEE",
          entityId: employeeId,
          action: "MEMBER_MOVED",
          actor: user.username,
          actorType: "USER",
          actorId: user.id,
          details: {
            fromOrgUnitId: before?.orgUnitId ?? null,
            toOrgUnitId: updated.orgUnitId,
          },
        });
      }

      return updated;
    });

    return NextResponse.json(employee);
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error);
    if (pErr) return pErr;
    console.error("Failed to patch employee:", error);
    return NextResponse.json({ error: "조직 정보 수정에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/employees/:id — 즉시 삭제 (ADMIN 전용)
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  try {
    const { id } = await params;
    const employeeId = Number(id);

    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, name: true, email: true, companyId: true, orgUnitId: true },
      });

      await tx.assignmentHistory.deleteMany({ where: { employeeId } });
      await tx.employee.delete({ where: { id: employeeId } });

      // Tombstone AuditLog
      await writeAuditLog(tx, {
        entityType: "EMPLOYEE",
        entityId: employeeId,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          tombstone: true,
          name: employee?.name,
          email: employee?.email,
          companyId: employee?.companyId,
          orgUnitId: employee?.orgUnitId,
          deletedAt: new Date().toISOString(),
          deletedBy: user.username,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return NextResponse.json(
      { error: "조직원 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
