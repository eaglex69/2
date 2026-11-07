"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BadgePercent,
  CheckCircle2,
  AlertCircle,
  Gamepad2,
  History,
  LifeBuoy,
  LogOut,
  Mail,
  Megaphone,
  MessagesSquare,
  Settings as SettingsIcon,
  Store,
  Users, Ticket } from "lucide-react";
import { Broadcast, Content, Dashboard, Logs, Market, News, Promos, Settings, Tickets } from "./AdminSections";
import AdminUsers from "./AdminUsers";
import { ContentEditor } from "./AdminContentDesign";
import { DesignEditor } from "./DesignEditor";
import { LayoutGrid, Palette, SlidersHorizontal, Sparkles, Download } from "lucide-react";
import { BalanceEditor } from "./AdminBalance";
import { BonusEditor } from "./AdminBonuses";
import { AdminExport } from "./AdminExport";
import { AdminExtras } from "./AdminExtras";
import type { Notify } from "./admin-kit";
import { SvgIcon } from "../svg-icons";

const sections = [
  { key: "dashboard", title: "Обзор", icon: Activity },
  { key: "users", title: "Игроки", icon: Users },
  { key: "tickets", title: "Обращения", icon: LifeBuoy },
  { key: "content", title: "Модерация", icon: MessagesSquare },
  { key: "items", title: "Контент игры", icon: LayoutGrid },
  { key: "balance", title: "Баланс", icon: SlidersHorizontal },
  { key: "bonuses", title: "Бонусы", icon: Sparkles },
  { key: "lottery", title: "Лотереи и стройка", icon: Ticket },
  { key: "design", title: "Дизайн", icon: Palette },
  { key: "market", title: "Рынок", icon: Store },
  { key: "broadcast", title: "Рассылка", icon: Mail },
  { key: "news", title: "Новости", icon: Megaphone },
  { key: "promos", title: "Промокоды", icon: BadgePercent },
  { key: "settings", title: "Настройки", icon: SettingsIcon },
  { key: "logs", title: "Журнал", icon: History },
  { key: "export", title: "Экспорт", icon: Download },
] as const;

type SectionKey = (typeof sections)[number]["key"];

export default function AdminPanel({ admin }: { admin: { displayName: string; username: string } }) {
  const [active, setActive] = useState<SectionKey>("dashboard");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const notify: Notify = useCallback((text, error) => setToast({ text, error }), []);

  useEffect(() => {
    const hash = window.location.hash.slice(1) as SectionKey;
    if (sections.some((section) => section.key === hash)) setActive(hash);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.error ? 5000 : 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function open(key: SectionKey) {
    setActive(key);
    window.history.replaceState(null, "", `#${key}`);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const current = sections.find((section) => section.key === active)!;
  return <div className="adm">
    <aside className="adm-side">
      <div className="adm-brand"><span><SvgIcon icon={SettingsIcon} size={18} /></span><div><strong>Тихая долина</strong><small>Панель администратора</small></div></div>
      <nav>{sections.map((section) => { const Icon = section.icon; return <button className={active === section.key ? "active" : ""} onClick={() => open(section.key)} key={section.key}><Icon size={18} /><span>{section.title}</span></button>; })}</nav>
      <div className="adm-side-foot">
        <a href="/"><SvgIcon icon={Gamepad2} size={16} />В игру</a>
        <button onClick={() => void logout()}><SvgIcon icon={LogOut} size={16} />Выйти</button>
      </div>
    </aside>
    <div className="adm-main">
      <header className="adm-top"><div><h1>{current.title}</h1><small>{admin.displayName} · @{admin.username}</small></div><a href="/" className="adm-top-link"><SvgIcon icon={Gamepad2} size={16} />В игру</a></header>
      <div className="adm-content">
        {active === "dashboard" && <Dashboard />}
        {active === "users" && <AdminUsers notify={notify} />}
        {active === "tickets" && <Tickets notify={notify} />}
        {active === "content" && <Content notify={notify} />}
        {active === "items" && <ContentEditor notify={notify} />}
        {active === "balance" && <BalanceEditor notify={notify} />}
        {active === "bonuses" && <BonusEditor notify={notify} />}
        {active === "lottery" && <AdminExtras notify={notify} />}
        {active === "design" && <DesignEditor notify={notify} />}
        {active === "market" && <Market notify={notify} />}
        {active === "broadcast" && <Broadcast notify={notify} />}
        {active === "news" && <News notify={notify} />}
        {active === "promos" && <Promos notify={notify} />}
        {active === "settings" && <Settings notify={notify} />}
        {active === "logs" && <Logs />}
        {active === "export" && <AdminExport />}
      </div>
    </div>
    {toast && <div className={`adm-toast ${toast.error ? "error" : ""}`}>{toast.error ? <SvgIcon icon={AlertCircle} size={18} /> : <SvgIcon icon={CheckCircle2} size={18} />}<span>{toast.text}</span></div>}
  </div>;
}
