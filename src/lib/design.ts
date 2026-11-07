import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assets, gameSettings } from "@/db/schema";
import { DEFAULT_DESIGN, sanitizeDesign, type Design } from "./design-config";

export * from "./design-config";

export async function getDesign(): Promise<Design> {
  const [row] = await db.select().from(gameSettings).where(eq(gameSettings.key, "design")).limit(1);
  if (!row) return DEFAULT_DESIGN;
  try { return sanitizeDesign(JSON.parse(row.value)); } catch { return DEFAULT_DESIGN; }
}

function checkImageMagic(mime: string, b64: string) {
  let head = "";
  let ascii = "";
  try {
    const buf = Buffer.from(b64.slice(0, 64), "base64");
    if (buf.length < 12) throw new Error("bad");
    head = buf.subarray(0, 12).toString("hex");
    ascii = buf.subarray(0, 12).toString("ascii");
  } catch {
    throw new Error("Файл повреждён");
  }
  const ok =
    (mime === "image/png" && head.startsWith("89504e470d0a1a0a")) ||
    (mime === "image/jpeg" && head.startsWith("ffd8ff")) ||
    (mime === "image/gif" && /^GIF8[79]a/.test(ascii)) ||
    (mime === "image/webp" && head.startsWith("52494646") && ascii.slice(8, 12) === "WEBP");
  if (!ok) throw new Error("Файл не похож на заявленный формат изображения");
}

function checkFontMagic(mime: string, b64: string) {
  let head = "";
  try {
    const buf = Buffer.from(b64.slice(0, 32), "base64");
    if (buf.length < 4) throw new Error("bad");
    head = buf.subarray(0, 4).toString("hex");
  } catch {
    throw new Error("Файл повреждён");
  }
  const ok =
    ((mime === "font/woff" || mime === "application/font-woff") && head === "774f4646") ||
    ((mime === "font/woff2" || mime === "application/font-woff2") && head === "774f4632") ||
    (mime === "font/ttf" && (head === "00010000" || head === "74727565")) ||
    (mime === "font/otf" && head === "4f54544f") ||
    mime === "application/octet-stream" ||
    mime === "application/vnd.ms-fontobject";
  if (!ok) throw new Error("Файл не похож на шрифт");
}

export async function saveAsset(key: string, dataUrl: string) {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Допустимы PNG, JPEG, WEBP или GIF");
  if (dataUrl.length > 1_600_000) throw new Error("Изображение слишком большое (до ~1,2 МБ)");
  checkImageMagic(match[1], match[2]);
  await db.insert(assets).values({ key, data: match[2], mime: match[1], updatedAt: new Date() }).onConflictDoUpdate({
    target: assets.key, set: { data: match[2], mime: match[1], updatedAt: new Date() },
  });
}

export async function saveFontAsset(key: string, dataUrl: string) {
  const match = /^data:((?:font\/(?:ttf|otf|woff|woff2))|(?:application\/(?:font-woff|font-woff2|vnd\.ms-fontobject|octet-stream)));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Допустимы TTF, OTF, WOFF или WOFF2");
  if (dataUrl.length > 4_200_000) throw new Error("Шрифт слишком большой (до ~3 МБ)");
  checkFontMagic(match[1], match[2]);
  await db.insert(assets).values({ key, data: match[2], mime: match[1], updatedAt: new Date() }).onConflictDoUpdate({
    target: assets.key, set: { data: match[2], mime: match[1], updatedAt: new Date() },
  });
}
