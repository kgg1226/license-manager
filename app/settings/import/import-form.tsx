"use client";

import { useState, useRef, useTransition } from "react";
import type { ImportType, ImportResult } from "@/lib/csv-import";
import { importCsv, getTemplateCsv } from "./actions";
import { templates } from "./templates";
import { useToast } from "@/app/toast";

const importTypes: { value: ImportType; label: string }[] = [
  { value: "licenses", label: "라이선스" },
  { value: "employees", label: "조직원" },
  { value: "groups", label: "그룹" },
  { value: "assignments", label: "할당" },
  { value: "seats", label: "시트(키)" },
];

export default function ImportForm() {
  const [type, setType] = useState<ImportType>("licenses");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleDownloadTemplate() {
    const csv = await getTemplateCsv(type);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(f: File | null) {
    setFile(f);
    setResult(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFileChange(f);
  }

  function handleSubmit() {
    if (!file) return;
    const formData = new FormData();
    formData.set("type", type);
    formData.set("file", file);

    startTransition(async () => {
      const res = await importCsv(formData);
      setResult(res);
      if (res.success) {
        const parts: string[] = [];
        if (res.created > 0) parts.push(`${res.created}건 생성`);
        if (res.updated > 0) parts.push(`${res.updated}건 업데이트`);
        toast(parts.join(", ") || "가져오기 완료");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else if (res.message) {
        toast(res.message, "error");
      }
    });
  }

  const template = templates[type];

  return (
    <div className="space-y-6">
      {/* Type Selector */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">가져오기 유형</label>
        <div className="flex flex-wrap gap-3">
          {importTypes.map((t) => (
            <label
              key={t.value}
              className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition ${
                type === t.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="importType"
                value={t.value}
                checked={type === t.value}
                onChange={() => { setType(t.value); setResult(null); }}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {/* Template Download */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">CSV 템플릿</p>
            <p className="mt-1 text-xs text-gray-500">
              필수 컬럼: {getRequiredHeaders(type).join(", ")} | 전체: {template.headers.join(", ")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            템플릿 다운로드
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
          file ? "border-blue-300 bg-blue-50" : "border-gray-300 bg-white hover:border-gray-400"
        }`}
      >
        {file ? (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="mt-1 text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            <button
              type="button"
              onClick={() => handleFileChange(null)}
              className="mt-2 text-xs text-red-600 hover:underline"
            >
              파일 제거
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-600">
              CSV 파일을 드래그하거나{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="font-medium text-blue-600 hover:underline"
              >
                파일 선택
              </button>
            </p>
            <p className="mt-1 text-xs text-gray-400">최대 5MB, .csv 파일만 가능</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </div>

      {/* Submit */}
      <button
        type="button"
        disabled={!file || isPending}
        onClick={handleSubmit}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "처리 중..." : "가져오기"}
      </button>

      {/* Results */}
      {result && (
        <div
          className={`rounded-lg border p-4 ${
            result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
          }`}
        >
          {result.success ? (
            <div>
              <p className="text-sm font-medium text-green-800">가져오기 완료</p>
              <p className="mt-1 text-sm text-green-700">
                {result.created > 0 && `${result.created}건 생성`}
                {result.created > 0 && result.updated > 0 && ", "}
                {result.updated > 0 && `${result.updated}건 업데이트`}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-red-800">
                {result.message || `${result.errors.length}개의 오류가 발견되었습니다.`}
              </p>
              {result.errors.length > 0 && (
                <div className="mt-3 max-h-64 overflow-auto rounded border border-red-200 bg-white">
                  <table className="min-w-full text-xs">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-red-700">행</th>
                        <th className="px-3 py-2 text-left font-medium text-red-700">컬럼</th>
                        <th className="px-3 py-2 text-left font-medium text-red-700">오류</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {result.errors.map((err, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-red-600">{err.row}</td>
                          <td className="px-3 py-1.5 font-mono text-red-600">{err.column}</td>
                          <td className="px-3 py-1.5 text-red-800">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getRequiredHeaders(type: ImportType): string[] {
  switch (type) {
    case "licenses": return ["name", "totalQuantity", "purchaseDate"];
    case "employees": return ["name", "department"];
    case "groups": return ["name"];
    case "assignments": return ["licenseName", "employeeEmail"];
    case "seats": return ["licenseName", "key"];
  }
}
