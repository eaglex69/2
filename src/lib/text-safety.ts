// Защита пользовательского текста от подмены отображения и служебных символов.
// U+202A…U+202E и U+2066…U+2069 переопределяют направление письма и позволяют
// визуально подделать имя («admin» против «аdmin») или переставить текст в чате.
const BIDI_CONTROL = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
// Управляющие символы C0/C1, кроме перевода строки и табуляции.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function cleanUserText(value: string, max: number): string {
  return value.replace(BIDI_CONTROL, "").replace(CONTROL_CHARS, "").trim().slice(0, max);
}

export function cleanDisplayName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = cleanUserText(value, 32).replace(/\s+/g, " ");
  return cleaned.length >= 2 ? cleaned : fallback;
}
