import { prisma } from "@/lib/prisma";
import type { License } from "@/generated/prisma/client";

/**
 * Compute the next renewal date for a license based on its renewal cycle.
 * Returns null for MANUAL cycle licenses.
 *
 * End-of-month clamping: if the base date is the 31st and the target month
 * has fewer days, the result is clamped to the last day of that month
 * (e.g. Jan 31 + 1 month = Feb 28).
 */
export function calcRenewalDate(license: License): Date | null {
  if (license.renewalCycle === "MANUAL") {
    return null;
  }

  const base = license.lastRenewedAt ?? license.firstPurchasedAt ?? license.purchaseDate;

  let monthsToAdd: number;
  switch (license.renewalCycle) {
    case "MONTHLY":
      monthsToAdd = 1;
      break;
    case "ANNUAL":
      monthsToAdd = 12;
      break;
    case "CUSTOM":
      monthsToAdd = license.cycleMonths ?? 1;
      break;
    default:
      return null;
  }

  return addMonthsClamped(base, monthsToAdd);
}

/**
 * Add months to a date with end-of-month clamping.
 *
 * When the source day exceeds the number of days in the target month,
 * the result is clamped to the last day of that month.
 */
function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date);
  const sourceDay = result.getDate();

  result.setMonth(result.getMonth() + months);

  // If the day shifted (e.g. 31 → 3 due to month overflow), clamp to last day
  if (result.getDate() !== sourceDay) {
    // Go back to the last day of the previous month
    result.setDate(0);
  }

  return result;
}

/**
 * Synchronize a single license's renewal date by rolling forward.
 *
 * If the computed renewal date is today or in the past, the cycle period is
 * added repeatedly until the renewal date lands in the future.
 * Iteration is capped at 100 for safety.
 *
 * Returns the updated License record.
 */
export async function syncRenewalDate(licenseId: number): Promise<License> {
  const license = await prisma.license.findUniqueOrThrow({
    where: { id: licenseId },
  });

  let nextDate = calcRenewalDate(license);

  if (nextDate === null) {
    return license;
  }

  const today = startOfDay(new Date());
  let iterations = 0;

  while (nextDate <= today && iterations < 100) {
    let monthsToAdd: number;
    switch (license.renewalCycle) {
      case "MONTHLY":
        monthsToAdd = 1;
        break;
      case "ANNUAL":
        monthsToAdd = 12;
        break;
      case "CUSTOM":
        monthsToAdd = license.cycleMonths ?? 1;
        break;
      default:
        monthsToAdd = 1;
    }
    nextDate = addMonthsClamped(nextDate, monthsToAdd);
    iterations++;
  }

  const updated = await prisma.license.update({
    where: { id: licenseId },
    data: { renewalDate: nextDate },
  });

  return updated;
}

/**
 * Batch-sync renewal dates for all non-MANUAL licenses.
 */
export async function syncAllRenewalDates(): Promise<License[]> {
  const licenses = await prisma.license.findMany({
    where: {
      renewalCycle: { not: "MANUAL" },
    },
  });

  const results: License[] = [];

  for (const license of licenses) {
    const updated = await syncRenewalDate(license.id);
    results.push(updated);
  }

  return results;
}

/**
 * Return a new Date set to midnight (00:00:00.000) of the given date.
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
