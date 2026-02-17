import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeleteButton from "./delete-button";

export const dynamic = "force-dynamic";

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return price.toLocaleString("ko-KR") + "원";
}

function getNoticeBadge(
  expiryDate: Date | null,
  noticePeriodDays: number | null
): { label: string; variant: "red" | "yellow" | "green" } | null {
  if (!expiryDate || !noticePeriodDays) return null;

  const noticeDate = new Date(expiryDate);
  noticeDate.setDate(noticeDate.getDate() - noticePeriodDays);

  const now = new Date();
  const diffMs = noticeDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "기한 초과", variant: "red" };
  }
  if (diffDays <= 7) {
    return { label: `D-${diffDays}`, variant: "red" };
  }
  if (diffDays <= 30) {
    return { label: `D-${diffDays}`, variant: "yellow" };
  }
  return { label: `D-${diffDays}`, variant: "green" };
}

const badgeColors = {
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-700",
};

export default async function LicensesPage() {
  const licenses = await prisma.license.findMany({
    orderBy: [
      { expiryDate: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ],
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">라이선스 목록</h1>
          <Link
            href="/licenses/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + 새 라이선스
          </Link>
        </div>

        {licenses.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">등록된 라이선스가 없습니다.</p>
            <Link
              href="/licenses/new"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              첫 번째 라이선스를 등록하세요 &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">라이선스명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">수량</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">금액</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">담당자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">구매일</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">만료일</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">해지 통보</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {licenses.map((license) => {
                  const badge = getNoticeBadge(license.expiryDate, license.noticePeriodDays);
                  return (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {license.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {license.totalQuantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right tabular-nums">
                        {formatPrice(license.price)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {license.adminName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {license.purchaseDate.toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {license.expiryDate?.toLocaleDateString("ko-KR") ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {badge ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[badge.variant]}`}>
                            {badge.label}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/licenses/${license.id}`}
                            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            수정
                          </Link>
                          <DeleteButton id={license.id} name={license.name} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
