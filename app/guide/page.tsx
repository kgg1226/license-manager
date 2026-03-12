"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  HardDrive,
  Cloud,
  FileText,
  Globe,
  FileSignature,
  Bell,
  Settings,
  Users,
  ArrowRight,
  BookOpen,
} from "lucide-react";

interface Step {
  id: string;
  title: string;
  description: string;
  details: string[];
  link?: { href: string; label: string };
}

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  steps: Step[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "start",
    icon: <Settings className="h-5 w-5" />,
    title: "시작하기",
    subtitle: "시스템 기본 설정",
    steps: [
      {
        id: "s1",
        title: "1. 조직 구조 설정",
        description: "회사와 부서를 등록하세요. 자산 배정과 보고서의 기반이 됩니다.",
        details: [
          "조직도 페이지에서 회사 → 부서 → 팀 순으로 등록",
          "조직원을 해당 부서에 배정",
          "조직원의 이메일을 정확히 입력해야 알림이 발송됩니다",
        ],
        link: { href: "/org", label: "조직도 설정" },
      },
      {
        id: "s2",
        title: "2. 조직원 등록",
        description: "자산을 배정받을 조직원을 등록합니다.",
        details: [
          "수동 등록: 조직원 > 새 조직원 등록",
          "일괄 등록: 설정 > 데이터 가져오기에서 CSV 파일 업로드",
          "부서, 직급, 이메일 정보를 정확히 입력하세요",
        ],
        link: { href: "/employees", label: "조직원 관리" },
      },
      {
        id: "s3",
        title: "3. 환경변수 설정 (서버 관리자)",
        description: "이메일·Slack 알림을 위한 서버 환경변수를 설정합니다.",
        details: [
          "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM — 이메일 발송용",
          "SLACK_WEBHOOK_URL — Slack Incoming Webhook URL",
          "docker-compose.yml 또는 .env 파일에서 설정",
          "설정 후 '알림 설정' 페이지에서 테스트 발송으로 확인하세요",
        ],
        link: { href: "/settings/notifications", label: "알림 테스트" },
      },
    ],
  },
  {
    id: "hardware",
    icon: <HardDrive className="h-5 w-5" />,
    title: "하드웨어 자산",
    subtitle: "노트북, 서버, 네트워크 장비 관리",
    steps: [
      {
        id: "h1",
        title: "1. 하드웨어 등록",
        description: "장비 유형별로 자산을 등록합니다.",
        details: [
          "장비 유형: Laptop / Desktop / Server / Network / Mobile / Other",
          "기본 정보: 자산명, 제조사, 모델, 시리얼 넘버",
          "Server/Network 장비는 IP, 서브넷, VLAN 등 네트워크 정보 입력 가능",
          "상태 등급 (A~D)으로 자산 컨디션 관리",
        ],
        link: { href: "/hardware/new", label: "하드웨어 등록" },
      },
      {
        id: "h2",
        title: "2. 보증/구매 관리",
        description: "보증 기간과 구매 정보를 기록합니다.",
        details: [
          "보증 만료일, 보증 업체 정보 기록",
          "PO 번호, 인보이스 번호로 구매 이력 추적",
          "보증 만료 시 상세 페이지에서 경고 표시",
        ],
      },
      {
        id: "h3",
        title: "3. 자산 배정/회수",
        description: "조직원에게 장비를 배정하고 회수합니다.",
        details: [
          "상세 페이지에서 담당자 배정",
          "회수 시 상태를 '재고'로 변경",
          "배정/회수 이력은 감사 로그에 자동 기록",
        ],
      },
    ],
  },
  {
    id: "cloud",
    icon: <Cloud className="h-5 w-5" />,
    title: "클라우드 자산",
    subtitle: "AWS, GCP, SaaS 구독 관리",
    steps: [
      {
        id: "c1",
        title: "1. 클라우드 자산 등록",
        description: "클라우드 서비스와 SaaS 구독을 등록합니다.",
        details: [
          "플랫폼 선택: AWS / GCP / Azure / Slack / GitHub 등",
          "서비스 분류: IaaS / PaaS / SaaS / Security 등",
          "리소스 타입과 ID를 기록하여 실제 리소스와 매핑",
        ],
        link: { href: "/cloud/new", label: "클라우드 등록" },
      },
      {
        id: "c2",
        title: "2. 계약/구독 관리",
        description: "계약 기간, 갱신일, 해지 통보 기한을 설정합니다.",
        details: [
          "계약 시작일 + 계약 기간(개월) 입력",
          "갱신 예정일: 자동 갱신 서비스의 다음 갱신일",
          "해지 통보 기한: 이 날짜 전에 해지를 통보해야 함",
          "결제 수단, 계약 번호 등 관리 정보 기록",
        ],
      },
      {
        id: "c3",
        title: "3. 알림 설정",
        description: "갱신일·해지 통보 기한 D-day 알림을 받으세요.",
        details: [
          "알림 채널: 이메일 / Slack / 둘 다 / 끄기",
          "관리자 이메일과 Slack ID를 입력하면 해당 담당자에게 직접 알림",
          "D-70, D-30, D-15, D-7 시점에 자동 알림 발송",
          "Slack ID는 'U'로 시작하는 멤버 ID (프로필에서 확인 가능)",
        ],
        link: { href: "/settings/notifications", label: "알림 테스트" },
      },
    ],
  },
  {
    id: "license",
    icon: <FileText className="h-5 w-5" />,
    title: "소프트웨어 라이선스",
    subtitle: "라이선스 키, 시트 배정 관리",
    steps: [
      {
        id: "l1",
        title: "1. 라이선스 등록",
        description: "소프트웨어 라이선스를 등록하고 시트를 관리합니다.",
        details: [
          "라이선스 타입: 키 기반 / 볼륨 / 키 없음",
          "수량, 단가, 결제 주기 (월/연) 설정",
          "만료일 기반으로 D-day 알림 자동 발송",
        ],
        link: { href: "/licenses/new", label: "라이선스 등록" },
      },
      {
        id: "l2",
        title: "2. 시트 배정",
        description: "조직원에게 라이선스 시트를 배정합니다.",
        details: [
          "라이선스 상세 페이지에서 시트 추가 및 배정",
          "시트별 키를 개별 관리 가능",
          "사용량 = 배정된 시트 / 전체 수량",
        ],
      },
    ],
  },
  {
    id: "domain",
    icon: <Globe className="h-5 w-5" />,
    title: "도메인·SSL",
    subtitle: "도메인, SSL 인증서 만료 관리",
    steps: [
      {
        id: "d1",
        title: "도메인/SSL 등록",
        description: "도메인과 SSL 인증서의 만료일을 관리합니다.",
        details: [
          "만료일 기반으로 자동 갱신 알림",
          "등록기관, 레코드 정보 기록",
        ],
        link: { href: "/domains/new", label: "도메인 등록" },
      },
    ],
  },
  {
    id: "contract",
    icon: <FileSignature className="h-5 w-5" />,
    title: "업체 계약",
    subtitle: "유지보수, SLA, 외주 계약 관리",
    steps: [
      {
        id: "ct1",
        title: "계약 등록",
        description: "업체 계약을 등록하고 만료일을 관리합니다.",
        details: [
          "계약 유형: 유지보수 / SLA / 외주 / 기타",
          "계약 상대방, 자동 갱신 여부 기록",
          "만료일 기반 알림",
        ],
        link: { href: "/contracts/new", label: "계약 등록" },
      },
    ],
  },
  {
    id: "notification",
    icon: <Bell className="h-5 w-5" />,
    title: "알림 시스템",
    subtitle: "이메일·Slack 알림 설정 및 테스트",
    steps: [
      {
        id: "n1",
        title: "1. 환경변수 설정",
        description: "알림 발송을 위한 SMTP와 Slack Webhook을 설정합니다.",
        details: [
          "이메일: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM",
          "Slack: SLACK_WEBHOOK_URL (Incoming Webhook)",
          "서버의 .env 파일 또는 docker-compose.yml environment 섹션에서 설정",
        ],
      },
      {
        id: "n2",
        title: "2. 연동 테스트",
        description: "설정이 올바른지 테스트 발송으로 확인합니다.",
        details: [
          "알림 설정 페이지에서 '테스트 발송' 버튼 클릭",
          "이메일/Slack 각각 독립적으로 테스트 가능",
          "실패 시 상세 오류 메시지와 해결 방법을 확인하세요",
        ],
        link: { href: "/settings/notifications", label: "알림 테스트 페이지" },
      },
      {
        id: "n3",
        title: "3. 알림 이력 확인",
        description: "발송된 알림의 성공/실패 이력을 확인합니다.",
        details: [
          "알림 설정 페이지 하단에서 최근 발송 이력 확인",
          "실패한 알림의 오류 메시지로 문제 원인 파악",
          "채널별, 상태별 필터링 지원",
        ],
        link: { href: "/settings/notifications", label: "발송 이력 보기" },
      },
    ],
  },
];

export default function GuidePage() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ start: true });
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalSteps = GUIDE_SECTIONS.reduce((sum, s) => sum + s.steps.length, 0);
  const doneSteps = Object.values(completedSteps).filter(Boolean).length;
  const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-7 w-7 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">관리자 가이드</h1>
          </div>
          <p className="text-gray-600">시스템을 단계별로 설정하세요. 완료한 항목을 체크하면 진행률을 추적할 수 있습니다.</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 rounded-lg bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">전체 진행률</span>
            <span className="text-sm font-bold text-blue-600">{doneSteps}/{totalSteps} 완료 ({progress}%)</span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {GUIDE_SECTIONS.map((section) => {
            const isExpanded = expandedSections[section.id];
            const sectionDone = section.steps.filter((s) => completedSteps[s.id]).length;
            const allDone = sectionDone === section.steps.length;

            return (
              <div key={section.id} className="rounded-lg bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${allDone ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                    {section.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-gray-900">{section.title}</h2>
                    <p className="text-xs text-gray-500">{section.subtitle}</p>
                  </div>
                  <span className="text-xs text-gray-400 mr-2">{sectionDone}/{section.steps.length}</span>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-4">
                    {section.steps.map((step) => {
                      const isDone = completedSteps[step.id];
                      return (
                        <div key={step.id} className="mt-4">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleStep(step.id)}
                              className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isDone ? "border-green-500 bg-green-500 text-white" : "border-gray-300 hover:border-blue-400"}`}
                            >
                              {isDone && <CheckCircle2 className="h-4 w-4" />}
                            </button>
                            <div className="flex-1">
                              <h3 className={`text-sm font-semibold ${isDone ? "text-gray-400 line-through" : "text-gray-900"}`}>{step.title}</h3>
                              <p className="mt-0.5 text-sm text-gray-600">{step.description}</p>
                              <ul className="mt-2 space-y-1">
                                {step.details.map((d, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                                    <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
                                    {d}
                                  </li>
                                ))}
                              </ul>
                              {step.link && (
                                <Link
                                  href={step.link.href}
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                                >
                                  {step.link.label}
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Links */}
        <div className="mt-8 rounded-lg bg-blue-50 p-5">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">빠른 링크</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { href: "/hardware/new", label: "하드웨어 등록" },
              { href: "/cloud/new", label: "클라우드 등록" },
              { href: "/licenses/new", label: "라이선스 등록" },
              { href: "/employees", label: "조직원 관리" },
              { href: "/settings/notifications", label: "알림 설정" },
              { href: "/history", label: "감사 로그" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md bg-white px-3 py-2 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-100 transition-colors text-center">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
