"use client";

import { useActionState, useState } from "react";
import {
  createUser,
  deleteUser,
  changePassword,
  updateUser,
  toggleUserActive,
} from "./actions";

type User = {
  id:        number;
  username:  string;
  email:     string | null;
  name:      string | null;
  role:      "ADMIN" | "USER";
  isActive:  boolean;
  createdAt: Date;
};

type FormState = { error?: string; success?: string };
const empty: FormState = {};

// ── 메인 테이블 ──────────────────────────────────────────────────────────────
export default function UserTable({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: number;
}) {
  const [showAdd, setShowAdd]         = useState(false);
  const [editTarget, setEditTarget]   = useState<User | null>(null);
  const [pwTarget, setPwTarget]       = useState<User | null>(null);

  return (
    <div className="space-y-4">
      {/* 상단 액션 바 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">총 {users.length}명</span>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 새 사용자
        </button>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <Th>사용자명</Th>
              <Th>이름</Th>
              <Th>이메일</Th>
              <Th>역할</Th>
              <Th>상태</Th>
              <Th>가입일</Th>
              <Th center>관리</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-10 text-center text-sm text-gray-400"
                >
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUserId}
                  onEdit={() => setEditTarget(user)}
                  onChangePassword={() => setPwTarget(user)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 모달 */}
      {showAdd    && <AddUserModal    onClose={() => setShowAdd(false)} />}
      {editTarget && <EditUserModal   user={editTarget} currentUserId={currentUserId} onClose={() => setEditTarget(null)} />}
      {pwTarget   && <PasswordModal   user={pwTarget}   onClose={() => setPwTarget(null)} />}
    </div>
  );
}

// ── 행 ───────────────────────────────────────────────────────────────────────
function UserRow({
  user,
  isSelf,
  onEdit,
  onChangePassword,
}: {
  user: User;
  isSelf: boolean;
  onEdit: () => void;
  onChangePassword: () => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleToggle() {
    setToggling(true);
    const res = await toggleUserActive(user.id, user.isActive);
    if (res?.error) alert(res.error);
    setToggling(false);
  }

  async function handleDelete() {
    if (!window.confirm(`"${user.username}" 계정을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    const res = await deleteUser(user.id);
    if (res?.error) {
      alert(res.error);
      setDeleting(false);
    }
  }

  return (
    <tr className={`hover:bg-gray-50 ${!user.isActive ? "opacity-60" : ""}`}>
      {/* 사용자명 */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {user.username}
        {isSelf && (
          <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
            나
          </span>
        )}
      </td>

      {/* 이름 */}
      <td className="px-4 py-3 text-sm text-gray-700">
        {user.name ?? <span className="text-gray-300">—</span>}
      </td>

      {/* 이메일 */}
      <td className="px-4 py-3 text-sm text-gray-500">
        {user.email ?? <span className="text-gray-300">—</span>}
      </td>

      {/* 역할 */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            user.role === "ADMIN"
              ? "bg-purple-100 text-purple-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {user.role === "ADMIN" ? "관리자" : "일반"}
        </span>
      </td>

      {/* 상태 */}
      <td className="px-4 py-3">
        <button
          onClick={handleToggle}
          disabled={isSelf || toggling}
          title={isSelf ? "자신의 계정은 변경 불가" : user.isActive ? "클릭하여 비활성화" : "클릭하여 활성화"}
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            user.isActive
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-red-100 text-red-600 hover:bg-red-200"
          }`}
        >
          {toggling ? "..." : user.isActive ? "활성" : "비활성"}
        </button>
      </td>

      {/* 가입일 */}
      <td className="px-4 py-3 text-sm text-gray-400">
        {new Date(user.createdAt).toLocaleDateString("ko-KR")}
      </td>

      {/* 관리 */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          <IconBtn onClick={onEdit} label="수정" />
          <IconBtn onClick={onChangePassword} label="비밀번호" />
          <IconBtn
            onClick={handleDelete}
            label={deleting ? "..." : "삭제"}
            danger
            disabled={isSelf || deleting}
          />
        </div>
      </td>
    </tr>
  );
}

// ── 사용자 추가 모달 ─────────────────────────────────────────────────────────
function AddUserModal({ onClose }: { onClose: () => void }) {
  const [state, action, isPending] = useActionState(createUser, empty);

  return (
    <Modal title="새 사용자 추가" onClose={onClose}>
      <form action={action} className="space-y-4">
        <Alert state={state} onSuccess={onClose} />
        <Field label="사용자명 *">
          <input type="text" name="username" required autoFocus className="input" />
        </Field>
        <Field label="비밀번호 * (4자 이상)">
          <input type="password" name="password" required minLength={4} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="이름">
            <input type="text" name="name" className="input" />
          </Field>
          <Field label="이메일">
            <input type="email" name="email" className="input" />
          </Field>
        </div>
        <Field label="역할">
          <select name="role" className="input">
            <option value="USER">일반</option>
            <option value="ADMIN">관리자</option>
          </select>
        </Field>
        <ModalFooter onClose={onClose} isPending={isPending} submitLabel="생성" />
      </form>
    </Modal>
  );
}

// ── 사용자 수정 모달 ─────────────────────────────────────────────────────────
function EditUserModal({
  user,
  currentUserId,
  onClose,
}: {
  user: User;
  currentUserId: number;
  onClose: () => void;
}) {
  const bound = updateUser.bind(null, user.id);
  const [state, action, isPending] = useActionState(bound, empty);
  const isSelf = user.id === currentUserId;

  return (
    <Modal title={`수정 — ${user.username}`} onClose={onClose}>
      <form action={action} className="space-y-4">
        <Alert state={state} onSuccess={onClose} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="이름">
            <input
              type="text"
              name="name"
              defaultValue={user.name ?? ""}
              className="input"
            />
          </Field>
          <Field label="이메일">
            <input
              type="email"
              name="email"
              defaultValue={user.email ?? ""}
              className="input"
            />
          </Field>
        </div>
        <Field label="역할">
          <select
            name="role"
            defaultValue={user.role}
            disabled={isSelf}
            className="input disabled:opacity-50"
          >
            <option value="USER">일반</option>
            <option value="ADMIN">관리자</option>
          </select>
          {isSelf && (
            <p className="mt-1 text-xs text-gray-400">
              자신의 역할은 변경할 수 없습니다.
            </p>
          )}
          {/* hidden fallback for disabled select */}
          {isSelf && <input type="hidden" name="role" value={user.role} />}
        </Field>
        <ModalFooter onClose={onClose} isPending={isPending} submitLabel="저장" />
      </form>
    </Modal>
  );
}

// ── 비밀번호 변경 모달 ───────────────────────────────────────────────────────
function PasswordModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const bound = changePassword.bind(null, user.id);
  const [state, action, isPending] = useActionState(bound, empty);

  return (
    <Modal title={`비밀번호 재설정 — ${user.username}`} onClose={onClose}>
      <form action={action} className="space-y-4">
        <Alert state={state} onSuccess={onClose} />
        <Field label="새 비밀번호 (4자 이상)">
          <input
            type="password"
            name="password"
            required
            minLength={4}
            autoFocus
            className="input"
          />
        </Field>
        <ModalFooter onClose={onClose} isPending={isPending} submitLabel="변경" />
      </form>
    </Modal>
  );
}

// ── 공통 UI 헬퍼 ─────────────────────────────────────────────────────────────
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-5 text-base font-semibold text-gray-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Alert({
  state,
  onSuccess,
}: {
  state: FormState;
  onSuccess?: () => void;
}) {
  if (state.error) {
    return (
      <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    // 성공 메시지를 잠시 보여준 뒤 모달을 닫는다
    if (onSuccess) setTimeout(onSuccess, 600);
    return (
      <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
        {state.success}
      </p>
    );
  }
  return null;
}

function ModalFooter({
  onClose,
  isPending,
  submitLabel,
}: {
  onClose: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
      >
        취소
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "처리 중..." : submitLabel}
      </button>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  danger,
  disabled,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-blue-600 hover:bg-blue-50"
      }`}
    >
      {label}
    </button>
  );
}

function Th({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 ${
        center ? "text-center" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
