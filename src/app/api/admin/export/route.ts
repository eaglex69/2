import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/request-guard";
import { GameError } from "@/lib/game-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;
const run = promisify(execFile);
const globalLock = globalThis as typeof globalThis & { __valleyExportBuild?: Promise<void> };

async function info() {
  const result: Record<string, { ready: boolean; bytes: number; updatedAt: string | null }> = {};
  for (const type of ["next", "php"]) {
    try {
      const stat = await fs.stat(path.join(process.cwd(), "downloads", `valley-${type}.zip`));
      result[type] = { ready: true, bytes: stat.size, updatedAt: stat.mtime.toISOString() };
    } catch {
      result[type] = { ready: false, bytes: 0, updatedAt: null };
    }
  }
  return result;
}

async function buildOnce() {
  if (!globalLock.__valleyExportBuild) {
    globalLock.__valleyExportBuild = run(process.execPath, ["scripts/build-downloads.mjs"], {
      cwd: process.cwd(),
      timeout: 110_000,
      maxBuffer: 4 * 1024 * 1024,
    })
      .then(() => undefined)
      .finally(() => {
        globalLock.__valleyExportBuild = undefined;
      });
  }
  await globalLock.__valleyExportBuild;
}

async function authorize() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

export async function GET(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const params = new URL(request.url).searchParams;
  if (params.get("format") === "info") {
    return NextResponse.json(await info(), { headers: { "Cache-Control": "no-store" } });
  }
  const type = params.get("type") ?? "next";
  if (type !== "php" && type !== "next") return NextResponse.json({ error: "Неизвестный архив" }, { status: 400 });
  const file = path.join(process.cwd(), "downloads", `valley-${type}.zip`);
  try {
    const data = await fs.readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="valley-${type}.zip"`,
        "Content-Length": String(data.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    // Архива ещё нет — собираем оба из текущего проекта и отдаём сразу.
    try {
      await buildOnce();
    } catch (error) {
      console.error("Export build failed", error);
      return NextResponse.json({ error: "Не удалось собрать архивы. Нажмите «Обновить архивы» и повторите." }, { status: 500 });
    }
    try {
      const data = await fs.readFile(file);
      return new Response(new Uint8Array(data), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="valley-${type}.zip"`,
          "Content-Length": String(data.length),
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return NextResponse.json({ error: "Архив не найден после сборки" }, { status: 404 });
    }
  }
}

export async function POST(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  try {
    assertSameOrigin(request);
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
  try {
    await buildOnce();
    return NextResponse.json({ ok: true, message: "Оба архива обновлены из текущего проекта", archives: await info() });
  } catch (error) {
    console.error("Export build failed", error);
    return NextResponse.json({ error: "Не удалось собрать архивы. Проверьте зависимости проекта и повторите." }, { status: 500 });
  }
}
