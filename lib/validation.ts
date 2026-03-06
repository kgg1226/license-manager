// lib/validation.ts — ISMS-P 2.8 입력 검증 유틸리티
// 모든 v* 함수는 유효하지 않은 입력 시 ValidationError를 throw 한다.

import { NextResponse } from "next/server";

// ── ValidationError ──

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** catch 블록에서 ValidationError이면 400 반환, 아니면 null */
export function handleValidationError(error: unknown): NextResponse | null {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return null;
}

// ── String ──

/** 선택 문자열: trim 후 빈값이면 null, 길이 초과 시 에러 */
export function vStr(val: unknown, max = 200): string | null {
  if (val == null || val === "") return null;
  if (typeof val !== "string") throw new ValidationError("문자열이어야 합니다.");
  const s = val.trim();
  if (!s) return null;
  if (s.length > max) throw new ValidationError(`${max}자를 초과했습니다.`);
  return s;
}

/** 필수 문자열: 비어 있으면 에러 */
export function vStrReq(val: unknown, fieldName: string, max = 200): string {
  const s = vStr(val, max);
  if (!s) throw new ValidationError(`${fieldName}은(는) 필수입니다.`);
  return s;
}

// ── Number ──

/** 선택 숫자: null이면 null, NaN/범위 초과 시 에러 */
export function vNum(
  val: unknown,
  opts?: { min?: number; max?: number; integer?: boolean },
): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  if (isNaN(n) || !isFinite(n))
    throw new ValidationError("유효한 숫자가 아닙니다.");
  if (opts?.integer && !Number.isInteger(n))
    throw new ValidationError("정수여야 합니다.");
  if (opts?.min != null && n < opts.min)
    throw new ValidationError(`${opts.min} 이상이어야 합니다.`);
  if (opts?.max != null && n > opts.max)
    throw new ValidationError(`${opts.max} 이하여야 합니다.`);
  return n;
}

/** 필수 숫자 */
export function vNumReq(
  val: unknown,
  fieldName: string,
  opts?: { min?: number; max?: number; integer?: boolean },
): number {
  const n = vNum(val, opts);
  if (n == null) throw new ValidationError(`${fieldName}은(는) 필수입니다.`);
  return n;
}

// ── Date ──

/** 선택 날짜: null이면 null, Invalid Date 시 에러 */
export function vDate(val: unknown): Date | null {
  if (val == null || val === "") return null;
  const d = new Date(val as string);
  if (isNaN(d.getTime()))
    throw new ValidationError("유효하지 않은 날짜입니다.");
  return d;
}

/** 필수 날짜 */
export function vDateReq(val: unknown, fieldName: string): Date {
  const d = vDate(val);
  if (!d) throw new ValidationError(`${fieldName}은(는) 필수입니다.`);
  return d;
}

// ── Enum ──

/** 선택 enum: null이면 null, 허용값 밖이면 에러 */
export function vEnum<T extends string>(
  val: unknown,
  validValues: readonly T[],
): T | null {
  if (val == null || val === "") return null;
  if (!validValues.includes(val as T)) {
    throw new ValidationError(
      `유효하지 않은 값입니다. 허용값: ${validValues.join(", ")}`,
    );
  }
  return val as T;
}

/** 필수 enum */
export function vEnumReq<T extends string>(
  val: unknown,
  fieldName: string,
  validValues: readonly T[],
): T {
  const v = vEnum(val, validValues);
  if (v == null)
    throw new ValidationError(`${fieldName}은(는) 필수입니다. 허용값: ${validValues.join(", ")}`);
  return v;
}

// ── Email ──

/** 선택 이메일: 빈값이면 null, 형식 오류 시 에러 */
export function vEmail(val: unknown): string | null {
  if (val == null || val === "") return null;
  if (typeof val !== "string") throw new ValidationError("이메일은 문자열이어야 합니다.");
  const s = val.trim();
  if (!s) return null;
  if (s.length > 254) throw new ValidationError("이메일은 254자 이하여야 합니다.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    throw new ValidationError("이메일 형식이 올바르지 않습니다.");
  return s;
}

// ── Array<number> ──

/** 숫자 배열: 배열이 아니거나 비어 있으면 에러, 각 원소 정수 검증 */
export function vNumArr(val: unknown, fieldName: string): number[] {
  if (!Array.isArray(val) || val.length === 0) {
    throw new ValidationError(`${fieldName}은(는) 1개 이상이어야 합니다.`);
  }
  if (val.length > 1000) {
    throw new ValidationError(`${fieldName}은(는) 1000개 이하여야 합니다.`);
  }
  return val.map((item, i) => {
    const n = Number(item);
    if (isNaN(n) || !Number.isInteger(n)) {
      throw new ValidationError(`${fieldName}[${i}] 값이 유효하지 않습니다.`);
    }
    return n;
  });
}

// ── Boolean ──

/** Boolean 파싱: Boolean("false") === true 문제 방지 */
export function vBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (val === "true" || val === 1) return true;
  return false;
}

// ── Prisma 에러 핸들러 ──

/** Prisma P2002(unique)/P2003(FK)/P2025(not found) 에러를 적절한 HTTP 응답으로 변환 */
export function handlePrismaError(
  error: unknown,
  options?: {
    uniqueMessage?: string;
    fkMessage?: string;
    notFoundMessage?: string;
  },
): NextResponse | null {
  if (!(error instanceof Error) || !("code" in error)) return null;
  const code = (error as { code: string }).code;

  switch (code) {
    case "P2002": // Unique constraint violated
      return NextResponse.json(
        { error: options?.uniqueMessage ?? "이미 존재하는 값입니다." },
        { status: 409 },
      );
    case "P2003": // Foreign key constraint failed
      return NextResponse.json(
        { error: options?.fkMessage ?? "참조된 리소스를 찾을 수 없습니다." },
        { status: 400 },
      );
    case "P2025": // Record not found (update/delete on missing)
      return NextResponse.json(
        { error: options?.notFoundMessage ?? "대상을 찾을 수 없습니다." },
        { status: 404 },
      );
    default:
      return null;
  }
}
