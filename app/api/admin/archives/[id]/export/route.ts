// POST /api/admin/archives/[id]/export — 증적 파일 생성 및 Google Drive 업로드

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isGoogleDriveConfigured, uploadToGoogleDrive } from "@/lib/google-drive";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  const { id } = await params;
  const archiveId = Number(id);
  if (isNaN(archiveId)) return NextResponse.json({ error: "잘못된 ID입니다." }, { status: 400 });

  const archive = await prisma.archive.findUnique({
    where: { id: archiveId },
    include: { data: true },
  });

  if (!archive) return NextResponse.json({ error: "증적을 찾을 수 없습니다." }, { status: 404 });
  if (archive.status !== "COMPLETED") {
    return NextResponse.json({ error: "완료된 증적만 내보낼 수 있습니다." }, { status: 400 });
  }

  try {
    // Excel 파일 생성 (exceljs 사용)
    let fileUrl: string | null = null;

    if (isGoogleDriveConfigured()) {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Asset Manager";
      workbook.created = new Date();

      // Sheet 1: 요약
      const summarySheet = workbook.addWorksheet("요약");
      summarySheet.addRow(["기간", archive.yearMonth]);
      summarySheet.addRow(["생성일", new Date(archive.createdAt).toLocaleDateString("ko-KR")]);
      summarySheet.addRow(["완료일", archive.completedAt ? new Date(archive.completedAt).toLocaleDateString("ko-KR") : "-"]);

      // Sheet 2: 라이선스
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const archiveData = archive.data as any[];
      const licData = archiveData.find((d: any) => d.dataType === "licenses");
      if (licData) {
        const licSheet = workbook.addWorksheet("라이선스");
        const licenses = licData.payload as any[];
        if (licenses.length > 0) {
          licSheet.addRow(["ID", "라이선스명", "유형", "수량", "배정수", "단가", "통화", "납부주기", "연간비용(KRW)", "갱신상태", "만료일", "담당자"]);
          for (const l of licenses) {
            licSheet.addRow([
              l.id, l.name, l.licenseType, l.totalQuantity, l.assignedCount ?? 0,
              l.unitPrice ?? "", l.currency ?? "KRW", l.paymentCycle ?? "",
              l.totalAmountKRW ?? "", l.renewalStatus ?? "", l.expiryDate ?? "", l.adminName ?? "",
            ]);
          }
        }
      }

      // Sheet 3: 조직원
      const empData = archiveData.find((d: any) => d.dataType === "employees");
      if (empData) {
        const empSheet = workbook.addWorksheet("조직원");
        const employees = empData.payload as any[];
        if (employees.length > 0) {
          empSheet.addRow(["ID", "이름", "부서", "이메일", "상태"]);
          for (const e of employees) {
            empSheet.addRow([e.id, e.name, e.department, e.email ?? "", e.status]);
          }
        }
      }

      // Sheet 4: 변경 이력
      const auditData = archiveData.find((d: any) => d.dataType === "audit_logs");
      if (auditData) {
        const histSheet = workbook.addWorksheet("변경이력");
        const logs = auditData.payload as any[];
        if (logs.length > 0) {
          histSheet.addRow(["ID", "엔티티타입", "엔티티ID", "액션", "행위자", "일시"]);
          for (const l of logs) {
            histSheet.addRow([l.id, l.entityType, l.entityId, l.action, l.actor ?? "", l.createdAt]);
          }
        }
      }

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const fileName = `asset-archive-${archive.yearMonth}.xlsx`;
      fileUrl = await uploadToGoogleDrive(
        buffer,
        fileName,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        archive.yearMonth
      );

      await prisma.archive.update({
        where: { id: archiveId },
        data: { excelUrl: fileUrl, fileUrl },
      });

      await prisma.archiveLog.create({
        data: { archiveId, level: "info", message: `Google Drive 업로드 완료: ${fileUrl}` },
      });
    } else {
      await prisma.archiveLog.create({
        data: { archiveId, level: "warn", message: "Google Drive 환경변수가 설정되지 않아 업로드를 건너뜁니다." },
      });
    }

    return NextResponse.json({
      ok: true,
      fileUrl,
      driveConfigured: isGoogleDriveConfigured(),
      message: isGoogleDriveConfigured() ? "Google Drive 업로드 완료" : "Google Drive 미설정 — 업로드 건너뜀",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Archive export failed:", error);
    await prisma.archiveLog.create({
      data: { archiveId, level: "error", message: `내보내기 실패: ${msg}` },
    }).catch(() => {});
    return NextResponse.json({ error: `내보내기에 실패했습니다: ${msg}` }, { status: 500 });
  }
}
