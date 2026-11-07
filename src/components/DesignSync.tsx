"use client";

import { useEffect } from "react";
import { designCss, sanitizeDesign } from "@/lib/design-config";

// Обновляет стили темы без перезагрузки страницы, когда админ меняет оформление.
// Первоначальная тема уже вставлена на сервере в layout, лишних запросов нет.
export default function DesignSync({ design }: { design?: unknown }) {
  useEffect(() => {
    if (!design) return;
    const css = designCss(sanitizeDesign(design));
    const tag = document.getElementById("game-design");
    if (tag && tag.textContent !== css) tag.textContent = css;
  }, [design]);
  return null;
}
