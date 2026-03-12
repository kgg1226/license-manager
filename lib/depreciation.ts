// lib/depreciation.ts — 정액법 감가상각 계산 유틸리티
// 서버/클라이언트 모두에서 사용 가능 (순수 TypeScript)

export interface DepreciationInfo {
  purchasePrice: number;
  usefulLifeYears: number;
  purchaseDate: Date;
  annualDepreciation: number;
  monthlyDepreciation: number;
  elapsedYears: number;
  bookValue: number;
  depreciationRate: number;
}

/**
 * 정액법(Straight-line) 감가상각 계산
 *
 * @param cost           취득가액 (VAT 포함)
 * @param usefulLifeYears 내용연수 (기본 5년)
 * @param purchaseDate   취득일
 * @param asOfDate       기준일 (기본 현재)
 * @returns DepreciationInfo
 */
export function calculateDepreciation(
  cost: number,
  usefulLifeYears: number,
  purchaseDate: Date,
  asOfDate: Date = new Date(),
): DepreciationInfo {
  const annualDepreciation = Math.floor(cost / usefulLifeYears);
  const monthlyDepreciation = Math.floor(annualDepreciation / 12);
  const elapsedMs = asOfDate.getTime() - purchaseDate.getTime();
  const elapsedYears = elapsedMs / (365.25 * 24 * 60 * 60 * 1000);
  const totalDepreciation = Math.min(
    Math.floor(annualDepreciation * elapsedYears),
    cost,
  );
  const bookValue = Math.max(cost - totalDepreciation, 0);
  const depreciationRate = cost > 0 ? totalDepreciation / cost : 0;

  return {
    purchasePrice: cost,
    usefulLifeYears,
    purchaseDate,
    annualDepreciation,
    monthlyDepreciation,
    elapsedYears: Math.round(elapsedYears * 100) / 100,
    bookValue,
    depreciationRate: Math.round(depreciationRate * 100) / 100,
  };
}
