"use client";

import type { ComponentProps } from "react";
import type { ModuleKey, OpenModule } from "./game-types";
import { FarmArt } from "./FarmArt";
import { CagesModule, FishingModule, PondsModule } from "./ProductionModules";

type Props = ComponentProps<typeof PondsModule>;

// Единый раздел «Водоёмы»: пруды, садок и рыбалка в одном месте.
export default function WaterHub({ tab, open, ...props }: Props & { tab: ModuleKey; open: OpenModule }) {
  const { state } = props.payload;
  const ready = (slots: { species: string | null; readyAt: number }[]) => slots.filter((slot) => slot.species && slot.readyAt <= props.now).length;
  const tabs = [
    { key: "ponds" as const, art: "pond", label: "Пруды", hint: "Карп и форель", badge: ready(state.ponds) },
    { key: "cages" as const, art: "cage", label: "Садок", hint: "Крупные породы", badge: ready(state.cages) },
    { key: "fishing" as const, art: "rod", label: "Рыбалка", hint: "Северное озеро", badge: state.fishing && state.fishing.expiresAt > props.now ? 1 : 0 },
  ];
  const current = tab === "cages" || tab === "fishing" ? tab : "ponds";
  return <div className="water-hub">
    <div className="water-tabs" role="tablist" aria-label="Разделы водоёмов">
      {tabs.map((item) => <button role="tab" aria-selected={current === item.key} className={`water-tab ${current === item.key ? "active" : ""}`} key={item.key} onClick={() => open(item.key)}>
        <FarmArt name={item.art} size={48} overrideKey={`ui:module:${item.key}`} />
        <span><strong>{item.label}</strong><small>{item.hint}</small></span>
        {item.badge > 0 && <em>{item.badge}</em>}
      </button>)}
    </div>
    {current === "ponds" && <PondsModule {...props} />}
    {current === "cages" && <CagesModule {...props} />}
    {current === "fishing" && <FishingModule {...props} />}
  </div>;
}
