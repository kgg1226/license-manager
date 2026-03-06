import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { handleValidationError, vEnumReq, vBool, ValidationError } from "@/lib/validation";

const VALID_ROLES = ["ADMIN", "USER"] as const;

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/users/:id — 사용자 수정 { role?, isActive? } 또는 비밀번호 변경 { password }
export async function PUT(request: NextRequest, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const userId = Number(id);
    const body = await request.json();

    if (body.password !== undefined) {
      // ── 비밀번호 변경 검증 ──
      if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) {
        return NextResponse.json({ error: "비밀번호는 8자 이상 128자 이하여야 합니다." }, { status: 400 });
      }
      const hash = await hashPassword(body.password);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: userId }, data: { password: hash } });
        await writeAuditLog(tx, {
          entityType: "USER",
          entityId: userId,
          action: "UPDATED",
          actor: me.username,
          actorType: "USER",
          actorId: me.id,
          details: { change: "password" },
        });
      });
      return NextResponse.json({ message: "비밀번호가 변경되었습니다." });
    }

    // ── role / isActive 검증 ──
    const roleVal = body.role !== undefined
      ? vEnumReq(body.role, "role", VALID_ROLES) : undefined;
    const isActiveVal = body.isActive !== undefined ? vBool(body.isActive) : undefined;

    // 자신의 관리자 권한 박탈 방지
    if (me.id === userId && roleVal !== undefined && roleVal !== "ADMIN") {
      return NextResponse.json({ error: "자신의 관리자 권한은 제거할 수 없습니다." }, { status: 400 });
    }
    // 자신의 비활성화 방지
    if (me.id === userId && isActiveVal === false) {
      return NextResponse.json({ error: "자신의 계정은 비활성화할 수 없습니다." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: {
          ...(roleVal !== undefined && { role: roleVal }),
          ...(isActiveVal !== undefined && { isActive: isActiveVal }),
        },
        select: { id: true, username: true, role: true, isActive: true, createdAt: true },
      });

      // 비활성화 시 세션 전부 파기
      if (isActiveVal === false) {
        await tx.session.deleteMany({ where: { userId } });
      }

      await writeAuditLog(tx, {
        entityType: "USER",
        entityId: userId,
        action: "UPDATED",
        actor: me.username,
        actorType: "USER",
        actorId: me.id,
        details: {
          targetUsername: u.username,
          ...(roleVal !== undefined && { role: u.role }),
          ...(isActiveVal !== undefined && { isActive: u.isActive }),
        },
      });

      return u;
    });

    return NextResponse.json(updated);
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "사용자 수정에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/admin/users/:id — 사용자 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const userId = Number(id);

    if (me.id === userId) {
      return NextResponse.json({ error: "자기 자신은 삭제할 수 없습니다." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true },
      });

      await tx.session.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });

      await writeAuditLog(tx, {
        entityType: "USER",
        entityId: userId,
        action: "DELETED",
        actor: me.username,
        actorType: "USER",
        actorId: me.id,
        details: {
          targetUsername: target?.username,
          deletedBy: me.username,
          deletedAt: new Date().toISOString(),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "사용자 삭제에 실패했습니다." }, { status: 500 });
  }
}
