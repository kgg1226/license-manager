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
      "isVolumeLicense",
      "price",
      "expiryDate",
      "contractDate",
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
        "true",
        "150000",
        "2025-01-15",
        "2024-01-10",
        "30",
        "김관리",
        "연간 구독",
      ],
      [
        "Adobe Acrobat Pro",
        "1",
        "2024-03-01",
        "ABCDE-12345",
        "false",
        "250000",
        "2025-03-01",
        "",
        "",
        "",
        "개별 라이선스",
      ],
    ],
  },
  employees: {
    label: "조직원",
    headers: ["name", "department", "email", "groupName"],
    sampleRows: [
      ["홍길동", "개발팀", "hong@example.com", "기본 그룹"],
      ["김철수", "마케팅팀", "kim@example.com", ""],
    ],
  },
  groups: {
    label: "그룹",
    headers: ["name", "description", "isDefault", "licenseNames"],
    sampleRows: [
      ["기본 그룹", "신규 입사자 기본 배정", "true", "Microsoft 365 Business;Slack"],
      ["디자인팀 그룹", "디자인팀 전용 라이선스", "false", "Adobe Creative Cloud"],
    ],
  },
  assignments: {
    label: "배정",
    headers: ["licenseName", "employeeEmail", "assignedDate", "reason"],
    sampleRows: [
      ["Microsoft 365 Business", "hong@example.com", "2024-06-01", "입사 시 배정"],
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
