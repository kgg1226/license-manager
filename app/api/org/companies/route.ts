// 신규: 회사(OrgCompany) 목록 조회 및 생성 API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/org/companies — 회사 목록 (하위 orgs 중첩 포함)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const companies = await prisma.orgCompany.findMany({
      include: {
        orgs: {
          include: {
            children: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Failed to fetch companies:", error);
    return NextResponse.json({ error: "회사 목록 조회에 실패했습니다." }, { status: 500 });
  }
}

// POST /api/org/companies — 회사 생성 { name }
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "회사명은 필수입니다." }, { status: 400 });
    }

    const company = await prisma.orgCompany.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Failed to create company:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "이미 존재하는 회사명입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "회사 생성에 실패했습니다." }, { status: 500 });
  }
}
