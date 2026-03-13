// BE-055: POST /api/cron/monthly-archive
// 매월 1일 00:00 실행 — 전월 정보자산 자동 증적
// 호출: CRON_SECRET 헤더 필요

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCronAuthorized } from "@/lib/cron-auth";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // 전월 계산
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const yearMonth = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  const startDate = new Date(prevYear, prevMonth - 1, 1);
  const endDate = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

  // 이미 완료된 증적이 있으면 스킵
  const existing = await prisma.archive.findFirst({
    where: { yearMonth, status: "COMPLETED" },
  });

  if (existing) {
    return NextResponse.json({ ok: true, message: `${yearMonth} 증적 이미 완료됨 (id: ${existing.id})`, skipped: true });
  }

  // 진행 중인 것이 있으면 스킵
  const running = await prisma.archive.findFirst({
    where: { yearMonth, status: { in: ["PENDING", "RUNNING"] } },
  });

  if (running) {
    return NextResponse.json({ ok: true, message: `${yearMonth} 증적 진행 중 (id: ${running.id})`, skipped: true });
  }

  // 새 증적 생성
  const archive = await prisma.archive.create({
    data: {
      yearMonth,
      status: "PENDING",
      trigger: "cron",
      startDate,
      endDate,
    },
  });

  // 비동기 실행 (응답을 먼저 반환 후 백그라운드에서 처리)
  runCronArchive(archive.id, yearMonth, startDate, endDate).catch(console.error);

  return NextResponse.json({
    ok: true,
    archiveId: archive.id,
    yearMonth,
    message: `${yearMonth} 증적 시작됨`,
  });
}

async function runCronArchive(archiveId: number, yearMonth: string, startDate: Date, endDate: Date) {
  try {
    await prisma.archive.update({ where: { id: archiveId }, data: { status: "RUNNING" } });

    await prisma.archiveLog.create({
      data: { archiveId, level: "info", message: `[CRON] ${yearMonth} 자동 증적 시작` },
    });

    // 라이선스 스냅샷
    const licenses = await prisma.license.findMany({
      where: { createdAt: { lte: endDate } },
      include: {
        assignments: { where: { returnedDate: null }, select: { employeeId: true } },
      },
    });

    await prisma.archiveData.upsert({
      where: { archiveId_dataType: { archiveId, dataType: "licenses" } },
      create: {
        archiveId,
        dataType: "licenses",
        payload: licenses.map((l) => ({
          id: l.id,
          name: l.name,
          licenseType: l.licenseType,
          totalQuantity: l.totalQuantity,
          unitPrice: l.unitPrice,
          currency: l.currency,
          paymentCycle: l.paymentCycle,
          totalAmountKRW: l.totalAmountKRW,
          isVatIncluded: l.isVatIncluded,
          renewalStatus: l.renewalStatus,
          expiryDate: l.expiryDate,
          adminName: l.adminName,
          assignedCount: l.assignments.length,
        })),
        recordCount: licenses.length,
      },
      update: {
        payload: licenses.map((l) => ({
          id: l.id, name: l.name, licenseType: l.licenseType,
          assignedCount: l.assignments.length,
        })),
        recordCount: licenses.length,
      },
    });

    // 조직원 스냅샷
    const employees = await prisma.employee.findMany({
      where: { status: { not: "DELETED" } },
      select: { id: true, name: true, department: true, email: true, status: true },
    });

    await prisma.archiveData.upsert({
      where: { archiveId_dataType: { archiveId, dataType: "employees" } },
      create: { archiveId, dataType: "employees", payload: employees, recordCount: employees.length },
      update: { payload: employees, recordCount: employees.length },
    });

    // 변경 이력
    const auditLogs = await prisma.auditLog.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: "asc" },
      take: 50000,
    });

    await prisma.archiveData.upsert({
      where: { archiveId_dataType: { archiveId, dataType: "audit_logs" } },
      create: { archiveId, dataType: "audit_logs", payload: auditLogs, recordCount: auditLogs.length },
      update: { payload: auditLogs, recordCount: auditLogs.length },
    });

    await prisma.archiveLog.create({
      data: {
        archiveId,
        level: "info",
        message: `[CRON] 라이선스 ${licenses.length}건, 조직원 ${employees.length}건, 이력 ${auditLogs.length}건 증적 완료`,
      },
    });

    await prisma.archive.update({
      where: { id: archiveId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await prisma.archive.update({ where: { id: archiveId }, data: { status: "FAILED" } }).catch(() => {});
    await prisma.archiveLog.create({
      data: { archiveId, level: "error", message: `[CRON] 증적 실패: ${msg}` },
    }).catch(() => {});
  }
}
