"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole, Sprout, UserRound } from "lucide-react";
import { Button } from "./game-ui";
import GameLogo from "./GameLogo";
import { SvgIcon } from "./svg-icons";

export default function AuthScreen({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Ошибка соединения");
      await onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка соединения");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-screen auth-bg">
    <div className="auth-top"><GameLogo /></div>
    <section className="auth-card">
      <div className="auth-tabs" role="tablist">
        <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Вход</button>
        <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Новая ферма</button>
      </div>
      <form onSubmit={submit} className="form-stack auth-form">
        {mode === "register" && <label><span>Имя фермера</span><div className="input-wrap"><SvgIcon icon={Sprout} size={18} /><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Например, Алекс" maxLength={32} autoComplete="nickname" /></div></label>}
        <label><span>Логин</span><div className="input-wrap"><SvgIcon icon={UserRound} size={18} /><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="3–24 символа" maxLength={24} required autoComplete="username" /></div></label>
        <label><span>Пароль</span><div className="input-wrap"><SvgIcon icon={LockKeyhole} size={18} /><input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Минимум 6 символов" minLength={6} maxLength={72} required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} /></div></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <Button type="submit" disabled={busy} className="btn-large">{busy ? "Открываем долину…" : mode === "login" ? "Войти в игру" : "Создать ферму"}<SvgIcon icon={ArrowRight} size={19} /></Button>
      </form>
      <p className="auth-footnote">Прогресс, письма и товары хранятся на сервере.</p>
    </section>
  </main>;
}
