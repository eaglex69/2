"use client";

import {
  Apple, Banana, Bird, Bot, Carrot, Cat, ChefHat, Coins, Crown, Dog, Egg, Fish, FishSymbol,
  Flower2, Gem, Gift, Grape, Hexagon, Leaf, Milk, Mountain, Package, Pickaxe, Rabbit, Salad,
  ShoppingBasket, Snail, Sparkles, Sprout, Star, Sun, Tractor, Truck, Waves, Wheat, WandSparkles,
  Anchor, Beef, Cherry, Citrus, Flame, Cookie, Croissant, Drumstick, Ham, IceCreamBowl, Nut, Panda, PawPrint, Shell,
  Shrimp, Soup, Squirrel, TreePine, Trophy, Vegan, Worm, type LucideIcon,
} from "lucide-react";
import { useDesign } from "./DesignProvider";

// Единый реестр SVG-иконок вместо эмодзи по всей игре.
export const GAME_ICONS: Record<string, LucideIcon> = {
  sprout: Sprout, sun: Sun, river: Waves, waves: Waves, mountain: Mountain, cow: Vegan, bird: Bird,
  cat: Cat, dog: Dog, fox: Squirrel, rabbit: Rabbit, pig: Ham, fish: Fish, duck: Bird,
  tractor: Tractor, crown: Crown, wand: WandSparkles, hexagon: Hexagon, chef: ChefHat,
  anchor: Anchor, bot: Bot, truck: Truck, barn: ShoppingBasket, leaf: Leaf, trophy: Trophy,
  carrot: Carrot, carrot_seed: Carrot, wheat: Wheat, wheat_seed: Wheat, onion: Salad, onion_seed: Salad,
  potato: Nut, potato_seed: Nut, tomato: Apple, tomato_seed: Apple, cucumber: Vegan, cucumber_seed: Vegan,
  pepper: Salad, pepper_seed: Salad, cabbage: Leaf, cabbage_seed: Leaf, corn: Wheat, corn_seed: Wheat,
  strawberry: Grape, strawberry_seed: Grape, pumpkin: Apple, pumpkin_seed: Apple,
  egg: Egg, duck_egg: Egg, milk: Milk, goat_milk: Milk, wool: Shell, feather: Bird, fur: Rabbit,
  honey: Hexagon, meat: Drumstick, truffle: TreePine,
  carp: Fish, carp_fry: Fish, crucian: FishSymbol, crucian_fry: FishSymbol, perch: Fish, perch_fry: Fish,
  trout: FishSymbol, trout_fry: FishSymbol, pike: Fish, catfish: Fish, catfish_fry: Fish,
  sturgeon: FishSymbol, sturgeon_fry: FishSymbol, eel: Worm, eel_fry: Worm, salmon: Fish, salmon_fry: Fish,
  golden_fish: Sparkles, shrimp: Shrimp,
  stone: Mountain, coal: Mountain, copper: Gem, iron: Gem, gold: Coins, pickaxe: Pickaxe,
  pickles: Soup, cheese: Vegan, jam: Grape, juice: Milk, bread: Croissant, butter: Cookie,
  soup: Soup, pie: Cookie, feed: Wheat, compound_feed: Fish, honey_cake: Cookie,
  cherry: Cherry, citrus: Citrus, flame: Flame,
  gift: Gift, star: Star, gem: Gem, snail: Snail, panda: Panda, paw: PawPrint, banana: Banana,
  beef: Beef, ice: IceCreamBowl, flower: Flower2, package: Package,
};

export function GameIcon({ name, size = 22, className = "", overrideKey }: { name: string; size?: number; className?: string; overrideKey?: string }) {
  const design = useDesign();
  const custom = (overrideKey && design.icons[overrideKey]) || design.icons[name];
  if (custom) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={custom} width={size} height={size} alt="" className={`game-icon-img ${className}`} style={{ width: size, height: size, objectFit: "contain" }} />;
  }
  const Icon = GAME_ICONS[name] ?? Leaf;
  return <Icon size={size} className={className} strokeWidth={1.9} aria-hidden />;
}

// Иконка интерфейса: можно заменить картинкой в админке (ключ ui:<id>).
export function UiIcon({ id, fallback: Fallback, size = 20, className = "" }: { id: string; fallback: LucideIcon; size?: number; className?: string }) {
  const design = useDesign();
  const custom = design.icons[`ui:${id}`];
  if (custom) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={custom} width={size} height={size} alt="" className={`game-icon-img ${className}`} style={{ width: size, height: size, objectFit: "contain" }} />;
  }
  return <Fallback size={size} className={className} aria-hidden />;
}

export function GameIconBadge({ name, size = 22, box = 44, bg }: { name: string; size?: number; box?: number; bg?: string }) {
  return <span className="game-icon-badge" style={{ width: box, height: box, background: bg }}><GameIcon name={name} size={size} /></span>;
}
