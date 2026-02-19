import { redirect } from "next/navigation";

// 기존 /admin 링크를 보존하기 위해 /admin/users 로 리다이렉트합니다.
export default function AdminPage() {
  redirect("/admin/users");
}
