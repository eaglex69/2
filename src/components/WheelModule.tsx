"use client";

import { useEffect, useRef, useState } from "react";
import { Coins, Gem, Sparkles, Wheat, Zap } from "lucide-react";
import { GLOBALS, WHEEL, dayKey } from "@/lib/game-config";
import type { Act, GamePayload } from "./game-types";
import { Button } from "./game-ui";
import { SvgIcon } from "./svg-icons";

type Props = { payload: GamePayload; now: number; busy: boolean; act: Act };
const SEGMENT = 360 / WHEEL.length;
const ICON: Record<string, typeof Coins> = { coins: Coins, gems: Gem, energy: Zap, item: Wheat };
const PrizeIcon = ({ kind, size = 16 }: { kind: string; size?: number }) => <SvgIcon icon={ICON[kind] ?? Sparkles} size={size} />;

const polar = (angle: number, radius: number) => {
  const rad = (angle - 90) * Math.PI / 180;
  return [100 + radius * Math.cos(rad), 100 + radius * Math.sin(rad)];
};
const sector = (index: number) => {
  const [x1, y1] = polar(index * SEGMENT, 90);
  const [x2, y2] = polar((index + 1) * SEGMENT, 90);
  return `M100 100 L${x1.toFixed(2)} ${y1.toFixed(2)} A90 90 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
};

const PALETTE: [string, string][] = [
  ["#ffe47a", "#f5a623"],
  ["#9df082", "#3fb950"],
  ["#7fd9ff", "#2589d8"],
  ["#ff9ab8", "#df4a7a"],
  ["#ffd066", "#e08716"],
  ["#b8a4ff", "#6e52d8"],
  ["#6fe3b0", "#229668"],
  ["#ffb366", "#d96a1c"],
];

export function WheelModule({ payload, now, busy, act }: Props) {
  const { state } = payload;
  const today = dayKey(new Date(now));
  const free = state.wheel.freeDay !== today;
  const paidToday = state.wheel.paidDay === today ? state.wheel.paidToday : 0;
  const limitReached = !free && paidToday >= GLOBALS.wheelPaidDaily;
  const last = state.wheel.last;

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  const [landedIndex, setLandedIndex] = useState<number | null>(null);
  const seenAt = useRef(last.at);
  const rotationRef = useRef(0);
  rotationRef.current = rotation;

  // При нажатии «Вращать» колесо сразу начинает плавно раскручиваться,
  // а когда сервер присылает выпавший сектор — докручивается точно в него.
  useEffect(() => {
    if (!awaiting) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(64, t - prev);
      prev = t;
      setRotation((r) => r + dt * 0.72);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [awaiting]);

  useEffect(() => {
    if (last.at === seenAt.current || last.index < 0) return;
    seenAt.current = last.at;
    setAwaiting(false);
    setSpinning(true);
    const current = rotationRef.current;
    const target = (360 - (last.index + 0.5) * SEGMENT) % 360;
    const delta = ((target - (current % 360)) + 360) % 360;
    setRotation(current + 360 * 5 + delta);
    const timer = window.setTimeout(() => {
      setSpinning(false);
      setLandedIndex(last.index);
    }, 4300);
    return () => window.clearTimeout(timer);
  }, [last.at, last.index]);

  async function spinWheel() {
    if (busy || spinning || awaiting) return;
    setLandedIndex(null);
    setAwaiting(true);
    const ok = await act({ type: "wheel-spin" });
    if (!ok) setAwaiting(false);
  }

  const activeSpin = awaiting || spinning;
  const prize = !activeSpin && landedIndex !== null ? WHEEL[landedIndex] : null;
  const pegs = Array.from({ length: 24 }, (_, i) => polar((i / 24) * 360, 94.5));

  return <div className="module-stack wheel-module">
    <div className="wheel-hero">
      <div className="wheel-stage">
        <div className="wheel-halo" aria-hidden="true" />
        <div className={`wheel-pointer ${activeSpin ? "is-ticking" : ""}`} aria-hidden="true" />
        <svg
          className="wheel-svg"
          viewBox="0 0 200 200"
          role="img"
          aria-label="Колесо фортуны"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4.2s cubic-bezier(.12,.72,.12,1)" : "none",
          }}
        >
          <defs>
            <pattern id="wheel-mandala" patternUnits="userSpaceOnUse" width="200" height="200">
              <image href="/images/wheel/mandala.jpg" x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid slice" />
            </pattern>
            <radialGradient id="wheel-rim" cx="35%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#fff0a6" />
              <stop offset="45%" stopColor="#d99326" />
              <stop offset="100%" stopColor="#6e410b" />
            </radialGradient>
            <radialGradient id="wheel-hub" cx="38%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fff9d6" />
              <stop offset="55%" stopColor="#f3b63a" />
              <stop offset="100%" stopColor="#8f540d" />
            </radialGradient>
            {PALETTE.map(([top, bottom], i) => (
              <radialGradient id={`wheel-sec-${i}`} key={i} cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor={top} />
                <stop offset="100%" stopColor={bottom} />
              </radialGradient>
            ))}
          </defs>

          <circle cx="100" cy="100" r="99" fill="url(#wheel-rim)" />
          <circle cx="100" cy="100" r="91" fill="#4f2d08" />

          {WHEEL.map((entry, index) => {
            const [tx, ty] = polar((index + 0.5) * SEGMENT, 67);
            const [ix, iy] = polar((index + 0.5) * SEGMENT, 44);
            const angle = (index + 0.5) * SEGMENT;
            return <g key={entry.id}>
              <path d={sector(index)} fill={`url(#wheel-sec-${index % PALETTE.length})`} stroke="#fff7dc" strokeWidth="1.6" />
              <circle cx={ix} cy={iy} r="10.5" fill="rgba(255,255,255,.85)" stroke="#8a5a1a" strokeWidth="1.2" />
              <text x={ix} y={iy} fontSize="11" fontWeight="900" fill="#5c360c" textAnchor="middle" dominantBaseline="central" transform={`rotate(${angle} ${ix} ${iy})`}>
                {entry.kind === "coins" ? "М" : entry.kind === "gems" ? "А" : entry.kind === "energy" ? "Э" : "П"}
              </text>
              <text x={tx} y={ty} fontSize="13.5" fontWeight="900" fill="#3a2106" stroke="#fff9e2" strokeWidth="2.4" paintOrder="stroke" textAnchor="middle" dominantBaseline="central" transform={`rotate(${angle} ${tx} ${ty})`}>
                {entry.label}
              </text>
            </g>;
          })}

          <circle cx="100" cy="100" r="90" fill="url(#wheel-mandala)" opacity="0.16" style={{ mixBlendMode: "overlay" }} />
          <circle cx="100" cy="100" r="90" fill="none" stroke="#fff3c4" strokeWidth="1.8" />

          {pegs.map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r={i % 3 === 0 ? 2.5 : 1.7} fill={i % 3 === 0 ? "#fffbe0" : "#ffd369"} stroke="#6e410b" strokeWidth="0.6" />
          ))}

          <circle cx="100" cy="100" r="21" fill="url(#wheel-hub)" stroke="#fff7d6" strokeWidth="3" />
          <circle cx="100" cy="100" r="14" fill="url(#wheel-mandala)" opacity="0.55" />
          <circle cx="100" cy="100" r="6" fill="#fff8d6" stroke="#8a5a1a" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="wheel-side">
        <h2>Колесо фортуны</h2>
        <p>Одно вращение в день бесплатно. Дальше — за {GLOBALS.wheelSpinGems} алмаза, до {GLOBALS.wheelPaidDaily} раз в сутки.</p>
        <div className={`wheel-result ${prize ? "show" : ""}`} aria-live="polite">
          {prize
            ? <>Выпало: <strong><PrizeIcon kind={prize.kind} size={18} /> {prize.kind === "item" ? `×${prize.amount}` : prize.kind === "energy" ? `+${prize.amount}` : prize.amount}</strong></>
            : activeSpin ? "Колесо вращается…" : "Нажмите «Вращать»"}
        </div>
        <Button className="btn-large wheel-button" disabled={busy || activeSpin || limitReached || (!free && state.gems < GLOBALS.wheelSpinGems)} onClick={() => void spinWheel()}>
          {free ? "Вращать бесплатно" : <>Вращать · <SvgIcon icon={Gem} size={16} />{GLOBALS.wheelSpinGems}</>}
        </Button>
        <small className="muted">{free ? "Бесплатное вращение доступно" : limitReached ? "Лимит платных вращений на сегодня исчерпан" : `Платных вращений сегодня: ${paidToday}/${GLOBALS.wheelPaidDaily}`}</small>
      </div>
    </div>
    <section className="panel wheel-prizes">
      <h3>Призы</h3>
      <div className="wheel-prize-grid">{WHEEL.map((entry) => <span key={entry.id} style={{ borderColor: entry.color }}><b><PrizeIcon kind={entry.kind} size={18} /></b>{entry.kind === "item" ? `Корм ×${entry.amount}` : entry.kind === "energy" ? `Энергия +${entry.amount}` : entry.kind === "gems" ? `${entry.amount} алм.` : `${entry.amount} монет`}<small>{Math.round(entry.weight / WHEEL.reduce((sum, item) => sum + item.weight, 0) * 100)}%</small></span>)}</div>
    </section>
  </div>;
}
