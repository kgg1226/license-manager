import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { handlePrismaError } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// PUT /api/assignments/:id — 반납 처리
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  try {
    const { id } = await params;
    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(id) },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "할당 내역을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (assignment.returnedDate) {
      return NextResponse.json(
        { error: "이미 반납 처리된 할당입니다." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const returned = await tx.assignment.update({
        where: { id: Number(id) },
        data: { returnedDate: new Date() },
        include: {
          license: { select: { name: true } },
          employee: { select: { name: true } },
        },
      });

      await writeAuditLog(tx, {
        entityType: "ASSIGNMENT",
        entityId: returned.id,
        action: "RETURNED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          licenseId: returned.licenseId,
          licenseName: returned.license.name,
          employeeId: returned.employeeId,
          employeeName: returned.employee.name,
        },
      });

      return returned;
    });

    return NextResponse.json({
      message: "반납 처리 완료",
      assignment: updated,
    });
  } catch (error) {
    const pErr = handlePrismaError(error);
    if (pErr) return pErr;
    console.error("Failed to return assignment:", error);
    return NextResponse.json(
      { error: "반납 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/assignments/:id — 할당 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  try {
    const { id } = await params;
    const assignmentId = Number(id);

    await prisma.$transaction(async (tx) => {
      const target = await tx.assignment.findUnique({
        where: { id: assignmentId },
        select: { licenseId: true, employeeId: true },
      });
      await tx.assignment.delete({ where: { id: assignmentId } });

      await writeAuditLog(tx, {
        entityType: "ASSIGNMENT",
        entityId: assignmentId,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { licenseId: target?.licenseId, employeeId: target?.employeeId },
      });
    });

    return NextResponse.json({ message: "할당이 삭제되었습니다." });
  } catch (error) {
    const pErr2 = handlePrismaError(error);
    if (pErr2) return pErr2;
    console.error("Failed to delete assignment:", error);
    return NextResponse.json(
      { error: "할당 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}