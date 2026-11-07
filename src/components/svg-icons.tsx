"use client";

import type { LucideIcon, LucideProps } from "lucide-react";
import { useDesign } from "./DesignProvider";

export type SvgIconProps = LucideProps & { icon: LucideIcon; overrideKey?: string };

// Единая точка рендеринга всех SVG. Если админ загрузил замену для
// ключа svg:<НазваниеИконки>, вместо Lucide SVG выводится пользовательская картинка.
export function SvgIcon({ icon: Icon, size = 24, overrideKey, className = "", ...props }: SvgIconProps) {
  const design = useDesign();
  const name = (Icon as unknown as { displayName?: string }).displayName ?? "";
  const custom = (overrideKey && design.icons[overrideKey]) || design.icons[`svg:${name}`];
  if (custom) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={custom} alt="" aria-hidden className={`game-icon-img ${className}`} style={{ width: size, height: size, objectFit: "contain" }} width={size} height={size} />;
  }
  return <Icon size={size} className={className} {...props} />;
}
