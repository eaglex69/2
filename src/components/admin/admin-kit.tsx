"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { SvgIcon } from "../svg-icons";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
export type Notify = (text: string, error?: boolean) => void;

export async function adminGet<T = Row>(section: string, params: Record<string, string | number> = {}): Promise<T> {
  const query = new URLSearchParams({ section, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const response = await fetch(`/api/admin?${query}`, { cache: "no-store" });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Ошибка запроса");
  return data;
}

export async function adminPost(action: Record<string, unknown>): Promise<{ message: string }> {
  const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
  const data = await response.json() as { error?: string; message?: string };
  if (!response.ok) throw new Error(data.error ?? "Ошибка действия");
  return { message: data.message ?? "Готово" };
}

export function useSection<T = Row>(section: string, params: Record<string, string | number> = {}) {
  const key = JSON.stringify(params);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminGet<T>(section, JSON.parse(key) as Record<string, string | number>));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [section, key]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}

export function useRunner(notify: Notify, after?: () => void | Promise<void>) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (action: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return false;
    setBusy(true);
    try {
      const result = await adminPost(action);
      notify(result.message);
      if (after) await after();
      return true;
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Ошибка", true);
      return false;
    } finally {
      setBusy(false);
    }
  }, [notify, after]);
  return { run, busy };
}

export function fmt(value: unknown) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(String(value)));
}

export function ago(value: unknown) {
  if (!value) return "—";
  const seconds = Math.max(0, (Date.now() - new Date(String(value)).getTime()) / 1000);
  if (seconds < 90) return "только что";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин назад`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} ч назад`;
  return `${Math.floor(seconds / 86_400)} дн назад`;
}

export function n(value: unknown) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(Number(value) || 0));
}

export function Card({ title, subtitle, action, children, className = "" }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`adm-card ${className}`}>
    {(title || action) && <div className="adm-card-head"><div>{title && <h3>{title}</h3>}{subtitle && <p>{subtitle}</p>}</div>{action}</div>}
    {children}
  </section>;
}

export function Btn({ children, kind = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "default" | "primary" | "danger" | "ghost" }) {
  return <button {...props} className={`adm-btn adm-btn-${kind} ${props.className ?? ""}`}>{children}</button>;
}

export function Pill({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "red" | "amber" | "blue" }) {
  return <span className={`adm-pill adm-pill-${tone}`}>{children}</span>;
}

export function Empty({ text }: { text: string }) {
  return <div className="adm-empty">{text}</div>;
}

export function Loading({ error, loading }: { error: string; loading: boolean }) {
  if (error) return <div className="adm-error">{error}</div>;
  if (loading) return <div className="adm-loading"><i /></div>;
  return null;
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="adm-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="adm-drawer">
      <div className="adm-drawer-head"><h2>{title}</h2><button onClick={onClose} aria-label="Закрыть"><SvgIcon icon={X} size={20} /></button></div>
      {children}
    </aside>
  </div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="adm-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
