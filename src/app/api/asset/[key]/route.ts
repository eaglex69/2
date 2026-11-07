import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assets } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  let decoded: string;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!/^(avatar:\d+|cover:\d+|theme:[a-zA-Z0-9_-]+)$/.test(decoded)) return new Response("Not found", { status: 404 });
  const [row] = await db.select().from(assets).where(eq(assets.key, decoded)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });
  const buffer = Buffer.from(row.data, "base64");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
