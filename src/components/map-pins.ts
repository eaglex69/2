import type { ModuleKey } from "./game-types";

export type Pin = {
  key: ModuleKey;
  icon: string;
  label: string;
  x: number;
  y: number;
  mx: number;
  my: number;
  art?: string;
  featured?: boolean;
};

// Отдельные координаты для панорамной карты ПК и вертикальной карты телефона.
// Пруды, садок и рыбалка — один объект «Водоёмы».
export const PINS: Pin[] = [
  { key: "barn", icon: "barn", art: "backpack", label: "Амбар", x: 49, y: 21, mx: 50, my: 19, featured: true },
  { key: "pens", icon: "bird", art: "egg", label: "Загоны", x: 28, y: 39, mx: 68, my: 46, featured: true },
  { key: "garden", icon: "carrot", art: "map", label: "Огород", x: 83, y: 51, mx: 34, my: 41, featured: true },
  { key: "shop", icon: "package", art: "shop", label: "Магазин", x: 84, y: 23, mx: 25, my: 80, featured: true },
  { key: "ponds", icon: "duck", art: "pond", label: "Водоёмы", x: 11, y: 60, mx: 72, my: 63, featured: true },
  { key: "mines", icon: "pickaxe", art: "pickaxe", label: "Шахты", x: 14, y: 30, mx: 64, my: 28, featured: true },
  { key: "elysium", icon: "wand", art: "wand", label: "Элизиум", x: 54, y: 42, mx: 50, my: 53, featured: true },
  { key: "cellar", icon: "chef", label: "Погреб", x: 37, y: 18, mx: 18, my: 56 },
  { key: "jobs", icon: "tractor", art: "joystick", label: "Работа", x: 58, y: 30, mx: 58, my: 33 },
  { key: "diamond", icon: "gem", art: "gem", label: "Алмазная", x: 12, y: 45, mx: 10, my: 31 },
  { key: "workers", icon: "truck", art: "joystick", label: "Работники", x: 19, y: 78, mx: 66, my: 35 },
  { key: "wheel", icon: "gift", art: "wheel", label: "Колесо фортуны", x: 68, y: 33, mx: 30, my: 57, featured: true },
  { key: "pvz", icon: "bug", art: "zombie", label: "Зомби", x: 74, y: 72, mx: 84, my: 54, featured: true },
  { key: "coop", icon: "paw", label: "Кооператив", x: 40, y: 58, mx: 48, my: 61 },
  { key: "city", icon: "trophy", art: "orders", label: "Город", x: 30, y: 70, mx: 40, my: 72 },
  { key: "bank", icon: "gold", art: "pig", label: "Банк", x: 65, y: 18, mx: 52, my: 70 },
];
