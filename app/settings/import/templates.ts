// 변경: assignments/groups label "배정"→"할당", employees 헤더에 title/companyName/orgName/subOrgName 추가

import type { ImportType } from "@/lib/csv-import";

type TemplateDefinition = {
  label: string;
  headers: string[];
  sampleRows: string[][];
};

export const templates: Record<ImportType, TemplateDefinition> = {
  licenses: {
    label: "라이선스",
    headers: [
      "name",
      "totalQuantity",
      "purchaseDate",
      "key",
      "licenseType",
      "price",
      "expiryDate",
      "noticePeriodDays",
      "adminName",
      "description",
    ],
    sampleRows: [
      [
        "Microsoft 365 Business",
        "50",
        "2024-01-15",
        "XXXXX-XXXXX-XXXXX",
        "VOLUME",
        "150000",
        "2025-01-15",
        "30",
        "김관리",
        "연간 구독",
      ],
      [
        "Adobe Acrobat Pro",
        "1",
        "2024-03-01",
        "",
        "KEY_BASED",
        "250000",
        "2025-03-01",
        "",
        "",
        "개별 라이선스",
      ],
      [
        "GitHub Teams",
        "30",
        "2024-06-01",
        "",
        "NO_KEY",
        "500000",
        "2025-06-01",
        "90",
        "이담당",
        "계정 기반 서비스",
      ],
    ],
  },
  employees: {
    label: "조직원",
    headers: ["name", "department", "email", "title", "companyName", "orgName", "subOrgName", "groupName"],
    sampleRows: [
      ["홍길동", "개발팀", "hong@example.com", "선임연구원", "본사", "개발본부", "백엔드팀", "기본 그룹"],
      ["김철수", "마케팅팀", "kim@example.com", "", "", "", "", ""],
    ],
  },
  groups: {
    label: "그룹",
    headers: ["name", "description", "isDefault", "licenseNames"],
    sampleRows: [
      ["기본 그룹", "신규 입사자 기본 할당", "true", "Microsoft 365 Business;Slack"],
      ["디자인팀 그룹", "디자인팀 전용 라이선스", "false", "Adobe Creative Cloud"],
    ],
  },
  assignments: {
    label: "할당",
    headers: ["licenseName", "employeeEmail", "assignedDate", "reason"],
    sampleRows: [
      ["Microsoft 365 Business", "hong@example.com", "2024-06-01", "입사 시 할당"],
      ["Slack", "kim@example.com", "", ""],
    ],
  },
  seats: {
    label: "시트(키)",
    headers: ["licenseName", "key"],
    sampleRows: [
      ["Adobe Acrobat Pro", "ABCDE-12345-FGHIJ"],
      ["Adobe Acrobat Pro", "KLMNO-67890-PQRST"],
    ],
  },
};

/** Generate a CSV string with BOM prefix for Korean Excel compatibility. */
export function generateTemplateCsv(type: ImportType): string {
  const template = templates[type];
  const BOM = "\uFEFF";
  const headerLine = template.headers.join(",");
  const dataLines = template.sampleRows.map((row) =>
    row.map((cell) => (cell.includes(",") || cell.includes(";") ? `"${cell}"` : cell)).join(",")
  );
  return BOM + [headerLine, ...dataLines].join("\n");
}
