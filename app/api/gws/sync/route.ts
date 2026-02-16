import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

// POST /api/gws/sync — Google Workspace 사용자 동기화
export async function POST() {
  try {
    // credential.json 파일 경로
    const credentialPath = path.join(process.cwd(), "credential.json");

    if (!fs.existsSync(credentialPath)) {
      return NextResponse.json(
        {
          error:
            "credential.json 파일이 존재하지 않습니다. 프로젝트 루트에 Google Service Account 키 파일을 배치하세요.",
        },
        { status: 400 }
      );
    }

    const adminEmail = process.env.GWS_ADMIN_EMAIL;
    const domain = process.env.GWS_DOMAIN;

    if (!adminEmail || !domain) {
      return NextResponse.json(
        {
          error:
            "GWS_ADMIN_EMAIL, GWS_DOMAIN 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.",
        },
        { status: 400 }
      );
    }

    // Service Account 인증 (Domain-wide Delegation)
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialPath,
      scopes: [
        "https://www.googleapis.com/auth/admin.directory.user.readonly",
      ],
      clientOptions: {
        subject: adminEmail,
      },
    });

    const service = google.admin({ version: "directory_v1", auth });

    // 도메인의 모든 사용자 조회
    const allUsers: Array<{
      primaryEmail?: string | null;
      name?: { fullName?: string | null } | null;
      orgUnitPath?: string | null;
      suspended?: boolean | null;
    }> = [];
    let pageToken: string | undefined;

    do {
      const res = await service.users.list({
        domain,
        maxResults: 200,
        pageToken,
        projection: "basic",
      });

      if (res.data.users) {
        allUsers.push(...res.data.users);
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    // DB에 Upsert (이메일 기준)
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const user of allUsers) {
      // 정지된 사용자 건너뛰기
      if (user.suspended) {
        skipped++;
        continue;
      }

      const email = user.primaryEmail ?? "";
      const name = user.name?.fullName ?? email.split("@")[0];
      const department = user.orgUnitPath?.replace(/^\//, "") || "미분류";

      if (!email) {
        skipped++;
        continue;
      }

      const existing = await prisma.employee.findUnique({
        where: { email },
      });

      if (existing) {
        await prisma.employee.update({
          where: { email },
          data: { name, department },
        });
        updated++;
      } else {
        await prisma.employee.create({
          data: { name, department, email },
        });
        created++;
      }
    }

    return NextResponse.json({
      message: "Google Workspace 동기화 완료",
      summary: {
        totalFetched: allUsers.length,
        created,
        updated,
        skipped,
      },
    });
  } catch (error) {
    console.error("GWS sync failed:", error);
    return NextResponse.json(
      { error: "Google Workspace 동기화에 실패했습니다.", details: String(error) },
      { status: 500 }
    );
  }
}