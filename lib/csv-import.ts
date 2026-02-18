export type ImportType = "licenses" | "employees" | "groups" | "assignments" | "seats";

export type RowError = {
  row: number;
  column: string;
  message: string;
};

export type ImportResult = {
  success: boolean;
  created: number;
  updated: number;
  errors: RowError[];
  message?: string;
};

/** Parse a date string (YYYY-MM-DD) and return a Date or null. Adds error if invalid. */
export function parseDate(
  value: string | undefined,
  row: number,
  column: string,
  errors: RowError[],
  required = false
): Date | null {
  if (!value?.trim()) {
    if (required) errors.push({ row, column, message: "필수 항목입니다." });
    return null;
  }
  const trimmed = value.trim();
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) {
    errors.push({ row, column, message: `잘못된 날짜 형식입니다: "${trimmed}" (YYYY-MM-DD)` });
    return null;
  }
  return d;
}

/** Parse a boolean string (true/false, 1/0, yes/no, Y/N). */
export function parseBoolean(
  value: string | undefined,
  row: number,
  column: string,
  errors: RowError[]
): boolean | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(v)) return true;
  if (["false", "0", "no", "n"].includes(v)) return false;
  errors.push({ row, column, message: `잘못된 값입니다: "${value}" (true/false, yes/no, 1/0)` });
  return null;
}

/** Require a field to be non-empty. Returns trimmed value or null (with error). */
export function requireField(
  value: string | undefined,
  row: number,
  column: string,
  errors: RowError[]
): string | null {
  if (!value?.trim()) {
    errors.push({ row, column, message: "필수 항목입니다." });
    return null;
  }
  return value.trim();
}

/** Parse a numeric string. */
export function parseNumber(
  value: string | undefined,
  row: number,
  column: string,
  errors: RowError[],
  required = false
): number | null {
  if (!value?.trim()) {
    if (required) errors.push({ row, column, message: "필수 항목입니다." });
    return null;
  }
  const n = Number(value.trim());
  if (isNaN(n)) {
    errors.push({ row, column, message: `숫자가 아닙니다: "${value}"` });
    return null;
  }
  return n;
}
