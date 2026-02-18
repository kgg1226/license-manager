import type { PrismaClient } from "@/generated/prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type SyncSeatsResult = {
  created: number;
  deleted: number;
  /** 삭제된 시트 중 키가 등록되어 있던 시트 수 (호출자가 경고 표시용으로 사용) */
  deletedWithKey: number;
};

/**
 * 개별 라이선스의 LicenseSeat 수를 totalQuantity에 맞춰 동기화한다.
 *
 * 삭제 우선순위:
 *   1. 키 없음 + 미배정  (데이터 유실 없음)
 *   2. 키 있음 + 미배정  (키 데이터 유실 — result.deletedWithKey 로 알림)
 *   ─ 배정 중인 시트는 절대 삭제하지 않음 ─
 *
 * 볼륨 라이선스는 noop.
 */
export async function syncSeats(
  tx: Tx,
  licenseId: number,
  totalQuantity: number
): Promise<SyncSeatsResult> {
  const license = await tx.license.findUnique({
    where: { id: licenseId },
    select: { isVolumeLicense: true, name: true },
  });

  if (!license || license.isVolumeLicense) {
    return { created: 0, deleted: 0, deletedWithKey: 0 };
  }

  const currentSeats = await tx.licenseSeat.findMany({
    where: { licenseId },
    include: {
      assignments: {
        where: { returnedDate: null },
        select: { id: true },
      },
    },
    orderBy: { id: "asc" },
  });

  const currentCount = currentSeats.length;

  // ── 시트 추가 ──────────────────────────────────────────────────────
  if (currentCount < totalQuantity) {
    const toCreate = totalQuantity - currentCount;
    for (let i = 0; i < toCreate; i++) {
      await tx.licenseSeat.create({ data: { licenseId } });
    }
    return { created: toCreate, deleted: 0, deletedWithKey: 0 };
  }

  // ── 시트 축소 ──────────────────────────────────────────────────────
  if (currentCount > totalQuantity) {
    const toDelete = currentCount - totalQuantity;

    // 현재 상태 분류
    const assigned = currentSeats.filter((s) => s.assignments.length > 0);
    const unassigned = currentSeats.filter((s) => s.assignments.length === 0);
    const unassignedNoKey = unassigned.filter((s) => s.key === null);
    const unassignedWithKey = unassigned.filter((s) => s.key !== null);

    // 삭제 가능한 시트 = 미배정만 (우선순위: 키없음 → 키있음)
    const deletable = [...unassignedNoKey, ...unassignedWithKey];

    if (deletable.length < toDelete) {
      throw new Error(
        `"${license.name}": 현재 ${assigned.length}개 시트가 배정 중이어서 ` +
          `수량을 ${totalQuantity}(으)로 줄일 수 없습니다. ` +
          `(현재 ${currentCount}개 중 삭제 가능 ${deletable.length}개, ` +
          `최소 수량 ${assigned.length}개)`
      );
    }

    const targets = deletable.slice(0, toDelete);
    const deletedWithKey = targets.filter((s) => s.key !== null).length;
    const idsToDelete = targets.map((s) => s.id);

    await tx.licenseSeat.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    return { created: 0, deleted: toDelete, deletedWithKey };
  }

  // 변경 없음
  return { created: 0, deleted: 0, deletedWithKey: 0 };
}

/**
 * 개별 → 볼륨 전환 시 모든 시트를 삭제한다.
 * 활성 배정이 1건이라도 있으면 전환 불가 에러.
 */
export async function deleteAllSeats(
  tx: Tx,
  licenseId: number
): Promise<void> {
  const stats = await tx.licenseSeat.findMany({
    where: { licenseId },
    select: {
      id: true,
      key: true,
      assignments: {
        where: { returnedDate: null },
        select: { id: true },
      },
    },
  });

  const activeCount = stats.filter((s) => s.assignments.length > 0).length;
  const keyedCount = stats.filter((s) => s.key !== null).length;

  if (activeCount > 0) {
    throw new Error(
      `배정 중인 시트가 ${activeCount}개 있어 볼륨 라이선스로 전환할 수 없습니다. ` +
        `먼저 모든 배정을 해제하세요.`
    );
  }

  if (stats.length > 0) {
    await tx.licenseSeat.deleteMany({ where: { licenseId } });
    if (keyedCount > 0) {
      // 호출자가 이 정보를 쓰진 않지만, 로그 용도로 남긴다
      console.log(
        `[deleteAllSeats] licenseId=${licenseId}: ${stats.length}개 시트 삭제 (키 등록 ${keyedCount}개 포함)`
      );
    }
  }
}
