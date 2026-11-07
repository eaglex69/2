"use client";

import { useDesign } from "./DesignProvider";

// Логотип «Тихая долина» собран из HTML/CSS. Текст и картинку можно заменить в админке.
export default function GameLogo({ compact = false }: { compact?: boolean }) {
  const design = useDesign();
  if (design.slots.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`game-logo-img ${compact ? "compact" : ""}`} src={design.slots.logo} alt={design.logoText} />;
  }
  const words = design.logoText.trim().split(/\s+/);
  const first = words[0] || "Ферма";
  const rest = words.slice(1).join(" ");
  return (
    <div className={`game-logo ${compact ? "compact" : ""}`} role="img" aria-label={design.logoText}>
      {design.icons["svg:logo-sprout"] ? <img className="logo-sprout" src={design.icons["svg:logo-sprout"]} alt="" /> : <svg className="logo-sprout" viewBox="0 0 120 58" aria-hidden>
        <path d="M58 56 C56 38 40 26 12 24 C16 44 34 54 58 56 Z" fill="#58c23f" stroke="#2c7a2a" strokeWidth="3" strokeLinejoin="round" />
        <path d="M62 56 C64 36 80 22 108 20 C104 42 86 54 62 56 Z" fill="#6fd24a" stroke="#2c7a2a" strokeWidth="3" strokeLinejoin="round" />
        <path d="M60 56 C53 40 55 22 60 4 C66 22 67 40 60 56 Z" fill="#8be05f" stroke="#2c7a2a" strokeWidth="3" strokeLinejoin="round" />
      </svg>}
      <div className="logo-emblem">
        <span className="logo-red">{first}</span>
        {rest && <span className="logo-green">{rest}</span>}
      </div>
      <div className="logo-banner">{design.logoSub}</div>
    </div>
  );
}
