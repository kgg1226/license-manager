import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/employees/:id — 조직원 상세 조회
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id: Number(id) },
      include: {
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

// PUT /api/employees/:id — 조직원 수정
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, department, email } = body;

    const employee = await prisma.employee.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(department !== undefined && { department }),
        ...(email !== undefined && { email: email || null }),
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Failed to update employee:", error);
    return NextResponse.json(
      { error: "조직원 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PATCH /api/employees/:id — 조직 정보 수정 { companyId?, orgId?, subOrgId?, title? }
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const { companyId, orgId, subOrgId, title } = body;

    const employee = await prisma.employee.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined && { title: title || null }),
        ...(companyId !== undefined && { companyId: companyId ? Number(companyId) : null }),
        ...(orgId !== undefined && { orgId: orgId ? Number(orgId) : null }),
        ...(subOrgId !== undefined && { subOrgId: subOrgId ? Number(subOrgId) : null }),
      },
      include: {
        company: { select: { id: true, name: true } },
        org: { select: { id: true, name: true } },
        subOrg: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Failed to patch employee:", error);
    return NextResponse.json({ error: "조직 정보 수정에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/employees/:id — 조직원 삭제 (활성 배정 이력 기록 후 삭제)
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    const employeeId = Number(id);

    // Log revocation history for active assignments before cascade delete
    const activeAssignments = await prisma.assignment.findMany({
      where: { employeeId, returnedDate: null },
    });

    if (activeAssignments.length > 0) {
      await prisma.assignmentHistory.createMany({
        data: activeAssignments.map((a) => ({
          assignmentId: null, // will be cascade-deleted
          licenseId: a.licenseId,
          employeeId,
          action: "REVOKED",
          reason: "Employee deleted",
        })),
      });
    }

    await prisma.employee.delete({
      where: { id: employeeId },
    });

    return NextResponse.json({ message: "조직원이 삭제되었습니다." });
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return NextResponse.json(
      { error: "조직원 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}