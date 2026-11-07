import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import AdminPanel from "@/components/admin/AdminPanel";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Админ-панель — Тихая долина", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return <main className="adm-denied">
      <div>
        <h1>Доступ закрыт</h1>
        <p>{user ? "У вашего аккаунта нет прав администратора." : "Войдите в игру под аккаунтом администратора, затем откройте эту страницу снова."}</p>
        <a href="/">Вернуться в игру</a>
      </div>
    </main>;
  }
  return <AdminPanel admin={{ displayName: user.displayName, username: user.username }} />;
}
