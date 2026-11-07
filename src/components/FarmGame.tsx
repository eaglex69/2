"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Coins,
  Gem,
  Home,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sprout,
  Store,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { xpNeeded } from "@/lib/game-config";
import type { GameAction } from "@/lib/game-engine";
import AuthScreen from "./AuthScreen";
import FarmMap from "./FarmMap";
import DesignSync from "./DesignSync";
import LoadingScreen from "./LoadingScreen";
import { BonusStrip } from "./BonusUi";
import { rebuildConfig } from "@/lib/content";
import { setBonuses } from "@/lib/bonus";
import { RatingModule, SeasonModule } from "./ProgressModules";
import { UiIcon } from "./icons";
import { MODULE_META } from "./module-meta";
import type { GamePayload, ModuleKey, SocialPayload } from "./game-types";
import { Avatar, Button, IconButton } from "./game-ui";
import { CellarModule, DiamondModule, ElysiumModule, GardenModule, JobsModule, MinesModule, PensModule } from "./ProductionModules";
import WaterHub from "./WaterHub";
import { WheelModule } from "./WheelModule";
import { BuildModule, LotteryModule } from "./ExtrasModules";
import { PvzModule } from "./PvzModule";
import { useDesign } from "./DesignProvider";
import { liveEnergy } from "@/lib/energy";
import { BarnModule, CityModule, MarketModule, NewsModule, PromosModule, ShopModule } from "./EconomyModules";
import { ChatModule, ForumModule, FriendsModule, MailModule, NewspaperModule, TicketsModule } from "./SocialModules";
import { OwnProfile, PublicProfile } from "./ProfileModules";
import BankModule from "./BankModule";
import CoopModule from "./CoopModule";
import { WorkersModule } from "./ProfileModules";
import { SvgIcon } from "./svg-icons";
import { GameDock, TopHud, WATER_KEYS, dockBadges } from "./GameChrome";

type Toast = { text: string; error?: boolean } | null;

export default function FarmGame() {
  const [auth, setAuth] = useState<"loading" | "guest" | "ready">("loading");
  const [basePayload, setPayload] = useState<GamePayload | null>(null);
  const design = useDesign();
  const [social, setSocial] = useState<SocialPayload | null>(null);
  const [active, setActive] = useState<ModuleKey>("home");
  const [selectedTopicId, setSelectedTopicId] = useState<number | undefined>();
  const [mailDraft, setMailDraft] = useState<{ username?: string; subject?: string; body?: string }>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [clock, setClock] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const [maintenance, setMaintenance] = useState("");
  // Заставка показывается один раз за сеанс. При обновлении страницы — без неё.
  const [boot, setBoot] = useState<"unknown" | "splash" | "quiet">("unknown");
  useEffect(() => {
    try { setBoot(window.sessionStorage.getItem("valley:splash") ? "quiet" : "splash"); } catch { setBoot("quiet"); }
  }, []);
  const now = clock + offset;
  // Энергия считается «вживую»: полоска плавно прибавляется, а разделы видят актуальное значение.
  const currentEnergy = basePayload ? liveEnergy(basePayload.state, now).energy : 0;
  const payload = useMemo(
    () => (basePayload ? { ...basePayload, state: { ...basePayload.state, energy: currentEnergy } } : null),
    [basePayload, currentEnergy],
  );

  const loadSocial = useCallback(async () => {
    const response = await fetch("/api/social", { cache: "no-store" });
    if (!response.ok) return false;
    const data = await response.json() as SocialPayload;
    setSocial(data);
    return true;
  }, []);

  const loadGame = useCallback(async () => {
    try {
      const response = await fetch("/api/game", { cache: "no-store" });
      if (response.status === 401) {
        setPayload(null);
        setSocial(null);
        setAuth("guest");
        return false;
      }
      if (response.status === 503) {
        const info = await response.json().catch(() => ({})) as { error?: string };
        setMaintenance(info.error ?? "Идут технические работы");
        setAuth("ready");
        return false;
      }
      if (!response.ok) throw new Error("Сервер фермы временно недоступен");
      const data = await response.json() as GamePayload;
      setMaintenance("");
      rebuildConfig(data.content ?? [], data.balance);
      setBonuses(data.bonuses ?? []);
      setPayload(data);
      setOffset(data.serverTime - Date.now());
      setClock(Date.now());
      setAuth("ready");
      return true;
    } catch (reason) {
      setToast({ text: reason instanceof Error ? reason.message : "Нет соединения", error: true });
      return false;
    }
  }, []);

  const bootstrap = useCallback(async () => {
    const ok = await loadGame();
    if (ok) await loadSocial();
  }, [loadGame, loadSocial]);

  useEffect(() => { void bootstrap(); }, [bootstrap]);
  const fishingActive = !!payload?.state.fishing && payload.state.fishing.expiresAt > now;
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), fishingActive ? 50 : 500);
    return () => window.clearInterval(timer);
  }, [fishingActive]);

  useEffect(() => {
    if (auth !== "ready") return;
    const timer = window.setInterval(() => {
      if (!busy) {
        void loadGame();
        if (["chat", "forum", "mail", "friends"].includes(active)) void loadSocial();
      }
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [active, auth, busy, loadGame, loadSocial]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.error ? 4500 : 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openProfile = useCallback((id: number) => setProfileId(id), []);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  useEffect(() => {
    if (auth !== "ready") return;
    const target = Number(new URLSearchParams(window.location.search).get("profile"));
    if (Number.isInteger(target) && target > 0) {
      setProfileId(target);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [auth]);

  const open = useCallback((module: ModuleKey, options?: { topicId?: number; username?: string; subject?: string; body?: string }) => {
    setActive(module);
    setSelectedTopicId(options?.topicId);
    if (module === "mail") setMailDraft({ username: options?.username, subject: options?.subject, body: options?.body });
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const act = useCallback(async (action: GameAction) => {
    if (busy) return false;
    setBusy(true);
    try {
      const response = await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      const data = await response.json() as { error?: string; message?: string; state?: GamePayload["state"]; user?: GamePayload["user"] };
      if (response.status === 401) { setAuth("guest"); return false; }
      if (!response.ok) throw new Error(data.error ?? "Действие не выполнено");
      setPayload((current) => current ? { ...current, state: data.state ?? current.state, user: data.user ?? current.user } : current);
      setToast({ text: data.message ?? "Готово" });
      if (action.type.startsWith("market-")) await loadGame();
      return true;
    } catch (reason) {
      setToast({ text: reason instanceof Error ? reason.message : "Нет соединения", error: true });
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy, loadGame]);

  const socialAct = useCallback(async (action: { type: string; [key: string]: unknown }) => {
    if (busy) return false;
    setBusy(true);
    try {
      const response = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      const data = await response.json() as { error?: string; message?: string; state?: GamePayload["state"] };
      if (response.status === 401) { setAuth("guest"); return false; }
      if (!response.ok) throw new Error(data.error ?? "Действие не выполнено");
      if (data.state) setPayload((current) => current ? { ...current, state: data.state! } : current);
      setToast({ text: data.message ?? "Готово" });
      await loadSocial();
      if (action.type.startsWith("mail-")) await loadGame();
      return true;
    } catch (reason) {
      setToast({ text: reason instanceof Error ? reason.message : "Нет соединения", error: true });
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy, loadGame, loadSocial]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setPayload(null);
    setSocial(null);
    setActive("home");
    setAuth("guest");
  }

  if (boot === "unknown") return <div className="boot-blank" />;
  if (boot === "splash") return <LoadingScreen ready={auth !== "loading"} onFinish={() => { try { window.sessionStorage.setItem("valley:splash", "1"); } catch { /* без хранилища */ } setBoot("quiet"); }} />;
  if (auth === "loading") return <div className="boot-blank"><span className="boot-spinner" aria-label="Загрузка" /></div>;
  if (maintenance && !payload) return <main className="loading-screen"><span className="brand-mark"><SvgIcon icon={Sprout} size={31} /></span><h1>Технические работы</h1><p style={{ maxWidth: 300, textAlign: "center", lineHeight: 1.5 }}>{maintenance}</p><Button onClick={() => void bootstrap()}>Проверить снова</Button><Button variant="soft" onClick={() => void logout()}>Выйти</Button></main>;
  if (auth === "guest" || !payload) return <AuthScreen onSuccess={bootstrap} />;
  const productionProps = { payload, now, busy, act };
  const socialProps = { payload, social: social ?? { chat: [], topics: [], replies: [], inbox: [], sent: [], friends: [], newspaper: [], tickets: [], serverTime: now }, now, busy, act, socialAct, open };
  const meta = MODULE_META[active];
  const badges = dockBadges(payload, social, now);
  const shellStyle = design.slots.moduleBg ? ({ "--module-bg": `url("${design.slots.moduleBg}")` } as React.CSSProperties) : undefined;
  const HeaderIcon = meta.icon;
  const levelNeed = xpNeeded(payload.state.level);

  let content: React.ReactNode;
  if (active === "home") content = <FarmMap payload={payload} social={socialProps.social} now={now} open={open} onMenu={() => setMenuOpen(true)} />;
  else if (active === "garden") content = <GardenModule {...productionProps} />;
  else if (WATER_KEYS.includes(active)) content = <WaterHub tab={active} open={open} {...productionProps} />;
  else if (active === "pens") content = <PensModule {...productionProps} />;
  else if (active === "cellar") content = <CellarModule {...productionProps} />;
  else if (active === "mines") content = <MinesModule {...productionProps} />;
  else if (active === "diamond") content = <DiamondModule {...productionProps} />;
  else if (active === "jobs") content = <JobsModule {...productionProps} />;
  else if (active === "barn") content = <BarnModule payload={payload} busy={busy} act={act} now={now} />;
  else if (active === "market") content = <MarketModule payload={payload} busy={busy} act={act} now={now} />;
  else if (active === "shop") content = <ShopModule payload={payload} busy={busy} act={act} now={now} />;
  else if (active === "city") content = <CityModule payload={payload} busy={busy} act={act} now={now} />;
  else if (active === "news") content = <NewsModule payload={payload} busy={busy} act={act} now={now} />;
  else if (active === "promos") content = <PromosModule payload={payload} busy={busy} act={act} now={now} />;
  else if (active === "elysium") content = <ElysiumModule {...productionProps} />;
  else if (active === "forum") content = <ForumModule social={socialProps.social} busy={busy} socialAct={socialAct} initialTopicId={selectedTopicId} onProfile={openProfile} />;
  else if (active === "chat") content = <ChatModule payload={payload} social={socialProps.social} busy={busy} socialAct={socialAct} onProfile={openProfile} />;
  else if (active === "newspaper") content = <NewspaperModule payload={payload} social={socialProps.social} busy={busy} socialAct={socialAct} />;
  else if (active === "tickets") content = <TicketsModule social={socialProps.social} busy={busy} socialAct={socialAct} />;
  else if (active === "mail") content = <MailModule payload={payload} social={socialProps.social} busy={busy} socialAct={socialAct} draft={mailDraft} />;
  else if (active === "wheel") content = <WheelModule {...productionProps} />;
  else if (active === "pvz") content = <PvzModule {...productionProps} />;
  else if (active === "build") content = <BuildModule payload={payload} act={act} busy={busy} />;
  else if (active === "lottery") content = <LotteryModule busy={busy} onChanged={() => void loadGame()} />;
  else if (active === "bank") content = <BankModule payload={payload} open={open} />;
  else if (active === "friends") content = <FriendsModule payload={payload} social={socialProps.social} busy={busy} socialAct={socialAct} open={open} onProfile={openProfile} />;
  else if (active === "rating") content = <RatingModule now={now} me={payload.user.id} onProfile={openProfile} />;
  else if (active === "season") content = <SeasonModule payload={payload} now={now} busy={busy} act={act} />;
  else if (active === "coop") content = <CoopModule payload={payload} onChanged={() => void loadGame()} onProfile={openProfile} />;
  else if (active === "workers") content = <WorkersModule payload={payload} busy={busy} onChanged={() => void loadGame()} />;
  else content = <OwnProfile payload={payload} busy={busy} act={act as (a: Record<string, unknown>) => Promise<boolean>} onLogout={logout} open={open} onProfile={openProfile} notify={(text, error) => setToast({ text, error })} />;

  return <div className={`game-shell ${active === "home" ? "on-map" : "inner"}`} style={shellStyle}>
    <DesignSync design={payload.design} />
    {active !== "home" && <TopHud payload={payload} now={now} active={active} open={open} onMenu={() => setMenuOpen(true)} />}
    {payload.banner && active !== "home" && <div className="game-banner" role="status">{payload.banner}</div>}
    {active !== "home" && <BonusStrip bonuses={payload.bonuses ?? []} now={now} onOpen={() => open("promos")} />}
    <main className={`module-content content-${active}`}>{!social && active !== "home" && ["forum", "chat", "newspaper", "tickets", "mail", "friends"].includes(active) ? <div className="inline-loading"><div className="loading-bar"><i /></div><p>Загружаем раздел…</p></div> : content}</main>
    {profileId !== null && <PublicProfile key={profileId} id={profileId} payload={payload} onClose={() => setProfileId(null)} open={open} onChanged={() => void loadGame()} onProfile={setProfileId} />}
    {toast && <div className={`toast ${toast.error ? "toast-error" : ""}`} role="status">{toast.error ? <SvgIcon icon={AlertCircle} size={19} /> : <SvgIcon icon={CheckCircle2} size={19} />}<span>{toast.text}</span><button onClick={() => setToast(null)} aria-label="Закрыть"><SvgIcon icon={X} size={15} /></button></div>}
    {active !== "home" && <GameDock badges={badges} active={active} open={open} fixed />}
    {menuOpen && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}><aside className="module-drawer"><div className="drawer-head"><div><span className="eyebrow">Тихая долина</span><h2>Все разделы</h2></div><IconButton label="Закрыть меню" onClick={() => setMenuOpen(false)}><SvgIcon icon={X} size={21} /></IconButton></div><div className="drawer-profile"><Avatar name={payload.user.avatar} size={43} /><div><strong>{payload.user.displayName}</strong><span>Уровень {payload.state.level} · {payload.online} игроков онлайн</span></div></div><div className="drawer-grid">{(Object.keys(MODULE_META) as ModuleKey[]).filter((key) => key !== "home" && key !== "cages" && key !== "fishing").map((key) => { const item = MODULE_META[key]; const Icon = item.icon; return <button className={active === key ? "active" : ""} onClick={() => open(key)} key={key}><UiIcon id={`module:${key}`} fallback={Icon} size={20} /><span>{item.title}</span>{key === "mail" && payload.unreadMail > 0 && <i>{payload.unreadMail}</i>}</button>; })}</div>{payload.user.role === "admin" && <a className="btn btn-dark drawer-admin" href="/admin"><SvgIcon icon={ShieldCheck} size={17} />Админ-панель</a>}<Button variant="soft" onClick={() => open("home")}><SvgIcon icon={Home} size={17} />На главную</Button></aside></div>}
  </div>;
}
