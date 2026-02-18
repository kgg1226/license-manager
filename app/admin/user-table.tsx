"use client";

import { useActionState, useState } from "react";
import { createUser, deleteUser, changePassword, updateRole } from "./actions";

type User = {
  id: number;
  username: string;
  role: "ADMIN" | "USER";
  createdAt: Date;
};

type FormState = { error?: string };

const initialState: FormState = {};

export default function UserTable({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: number;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);

  return (
    <div className="space-y-6">
      {/* 계정 목록 */}
      <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">계정 목록</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + 새 계정
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">사용자명</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">역할</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">가입일</th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isSelf={user.id === currentUserId}
                onChangePassword={() => setPasswordTarget(user)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* 새 계정 추가 모달 */}
      {showAddForm && <AddUserModal onClose={() => setShowAddForm(false)} />}

      {/* 비밀번호 변경 모달 */}
      {passwordTarget && (
        <ChangePasswordModal
          user={passwordTarget}
          onClose={() => setPasswordTarget(null)}
        />
      )}
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  onChangePassword,
}: {
  user: User;
  isSelf: boolean;
  onChangePassword: () => void;
}) {
  const [roleError, setRoleError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleRoleToggle() {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    const result = await updateRole(user.id, newRole);
    if (result?.error) setRoleError(result.error);
  }

  async function handleDelete() {
    if (!window.confirm(`"${user.username}" 계정을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    const result = await deleteUser(user.id);
    if (result?.error) {
      alert(result.error);
      setDeleting(false);
    }
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-3 text-sm font-medium text-gray-900">
        {user.username}
        {isSelf && (
          <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
            나
          </span>
        )}
      </td>
      <td className="px-6 py-3 text-sm">
        <div className="flex flex-col gap-1">
          <button
            onClick={handleRoleToggle}
            disabled={isSelf}
            className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
              user.role === "ADMIN"
                ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            title={isSelf ? "자신의 역할은 변경할 수 없습니다" : "클릭하여 역할 변경"}
          >
            {user.role === "ADMIN" ? "관리자" : "일반"}
          </button>
          {roleError && <p className="text-xs text-red-600">{roleError}</p>}
        </div>
      </td>
      <td className="px-6 py-3 text-sm text-gray-500">
        {new Date(user.createdAt).toLocaleDateString("ko-KR")}
      </td>
      <td className="px-6 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onChangePassword}
            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            비밀번호 변경
          </button>
          <button
            onClick={handleDelete}
            disabled={isSelf || deleting}
            className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? "..." : "삭제"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(createUser, initialState);

  return (
    <Modal title="새 계정 추가" onClose={onClose}>
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
        )}
        <Field label="사용자명">
          <input type="text" name="username" required autoFocus className="input" />
        </Field>
        <Field label="비밀번호">
          <input type="password" name="password" required minLength={4} className="input" />
        </Field>
        <Field label="역할">
          <select name="role" className="input">
            <option value="USER">일반</option>
            <option value="ADMIN">관리자</option>
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50">
            취소
          </button>
          <button type="submit" disabled={isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {isPending ? "생성 중..." : "생성"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ChangePasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const bound = changePassword.bind(null, user.id);
  const [state, formAction, isPending] = useActionState(bound, initialState);

  return (
    <Modal title={`비밀번호 변경 — ${user.username}`} onClose={onClose}>
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
        )}
        <Field label="새 비밀번호">
          <input type="password" name="password" required minLength={4} autoFocus className="input" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50">
            취소
          </button>
          <button type="submit" disabled={isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {isPending ? "변경 중..." : "변경"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-base font-semibold text-gray-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
