import ImportForm from "./import-form";

export default function ImportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">데이터 가져오기</h1>
          <p className="mt-1 text-sm text-gray-500">
            CSV 파일을 업로드하여 라이선스, 조직원, 그룹, 배정 데이터를 일괄 등록할 수 있습니다.
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <ImportForm />
        </div>
      </div>
    </div>
  );
}
