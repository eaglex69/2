export type ProfileFields = {
  gender?: string;
  age?: number;
  city?: string;
  hobbies?: string;
  favoriteCrop?: string;
  favoriteAnimal?: string;
  motto?: string;
  mood?: string;
  seeking?: string;
  playtime?: string;
  contacts?: string;
};

export const GENDERS = [["", "Не указан"], ["male", "Мужской"], ["female", "Женский"]] as const;
export const SEEKING = [["", "Не указано"], ["friends", "Друзей"], ["coop", "Кооператив"], ["trade", "Торговых партнёров"], ["chill", "Просто играю для души"]] as const;
export const PLAYTIME = [["", "Не указано"], ["morning", "Утром"], ["day", "Днём"], ["evening", "Вечером"], ["night", "Ночью"]] as const;

export function labelOf(list: readonly (readonly [string, string])[], value?: string) {
  return list.find(([key]) => key === value)?.[1] ?? "";
}

export function cleanProfile(input: unknown): ProfileFields {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const text = (key: string, max: number) => (typeof o[key] === "string" ? (o[key] as string).trim().slice(0, max) : "");
  const pick = (key: string, list: readonly (readonly [string, string])[]) => {
    const value = typeof o[key] === "string" ? (o[key] as string) : "";
    return list.some(([k]) => k === value) ? value : "";
  };
  const age = Number(o.age);
  return {
    gender: pick("gender", GENDERS),
    age: Number.isInteger(age) && age >= 6 && age <= 99 ? age : 0,
    city: text("city", 40),
    hobbies: text("hobbies", 120),
    favoriteCrop: text("favoriteCrop", 30),
    favoriteAnimal: text("favoriteAnimal", 30),
    motto: text("motto", 80),
    mood: text("mood", 50),
    seeking: pick("seeking", SEEKING),
    playtime: pick("playtime", PLAYTIME),
    contacts: text("contacts", 60),
  };
}
