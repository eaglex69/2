"use client";

import { useDesign } from "./DesignProvider";

// Объёмные игровые иконки. Пользовательская картинка из админки имеет приоритет.
export function FarmArt({ name, size = 56, className = "", overrideKey }: { name: string; size?: number; className?: string; overrideKey?: string }) {
  const design = useDesign();
  const custom = overrideKey ? design.icons[overrideKey] : undefined;
  // eslint-disable-next-line @next/next/no-img-element
  return <img
    className={`farm-art ${className}`}
    src={custom || `/images/icons/${name}.png`}
    width={size}
    height={size}
    alt=""
    draggable={false}
    style={{ width: size, height: size, objectFit: "contain" }}
  />;
}
