"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileCode2, Package, RefreshCw, Server, Smartphone } from "lucide-react";
import { Card } from "./admin-kit";
import { SvgIcon } from "../svg-icons";

type ArchiveInfo = { ready: boolean; bytes: number; updatedAt: string | null };
type Archives = { next?: ArchiveInfo; php?: ArchiveInfo };
const size = (bytes = 0) => bytes ? `${(bytes / 1024 / 1024).toFixed(1)} МБ` : "Архив пока недоступен";

export function AdminExport() {
  const isPhp = typeof window !== "undefined" && (window as unknown as { __VALLEY_CANVAS__?: boolean }).__VALLEY_CANVAS__ === true;
  const endpoint = isPhp ? "/api/export" : "/api/admin/export";
  const [archives, setArchives] = useState<Archives>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try { const response = await fetch(`${endpoint}?format=info`, { cache: "no-store" }); if (response.ok) setArchives(await response.json() as Archives); } catch { /* кнопки скачивания останутся доступны */ }
  }, [endpoint]);
  useEffect(() => { void load(); }, [load]);
  async function rebuild() {
    setBusy(true); setNotice("");
    try { const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); const data = await response.json() as { error?: string; message?: string; archives?: Archives }; if (!response.ok) throw new Error(data.error ?? "Ошибка сборки"); setNotice(data.message ?? "Архивы обновлены"); if (data.archives) setArchives(data.archives); else await load(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Ошибка сборки"); }
    finally { setBusy(false); }
  }
  return <div className="adm-stack">
    <Card title="Скачать версии отдельно" subtitle="Каждый архив содержит только выбранную версию со своей графикой, стилями, серверным кодом и инструкцией. Данные игроков и секреты не включены" action={<button className="adm-btn adm-btn-primary" disabled={busy} onClick={() => void rebuild()}><SvgIcon icon={RefreshCw} size={16} />{busy ? "Собираем…" : "Обновить архивы"}</button>}>
      {notice && <p className="adm-hint" role="status">{notice}</p>}
      <div className="adm-export-grid">
        <article className="adm-export-card"><span className="adm-export-icon"><SvgIcon icon={FileCode2} size={28} /></span><h3>Next.js + PostgreSQL</h3><p>Полные исходники основной версии: App Router, React, Drizzle ORM, все разделы игры и админки.</p><ul><li>Исходный TypeScript/React и конфигурация</li><li>Все изображения, PNG-иконки и стили</li><li>Drizzle-схема и скрипты сборки/админа</li><li>README с командами запуска</li></ul><p className="adm-hint">{size(archives.next?.bytes)}{archives.next?.updatedAt ? ` · ${new Date(archives.next.updatedAt).toLocaleString("ru-RU")}` : ""}</p><a className={`adm-btn adm-btn-primary ${isPhp && !archives.next?.ready ? "adm-btn-disabled" : ""}`} href={isPhp && !archives.next?.ready ? undefined : `${endpoint}?type=next`} download="valley-next.zip" aria-disabled={isPhp && !archives.next?.ready}><SvgIcon icon={Download} size={16} />Скачать Next.js</a></article>
        <article className="adm-export-card"><span className="adm-export-icon php"><SvgIcon icon={Server} size={28} /></span><h3>PHP + MySQL + AJAX + Canvas</h3><p>Самостоятельный PHP-сайт с общим интерфейсом, серверными правилами и Canvas-картой. Node.js для запуска не нужен.</p><ul><li>Готовый AJAX-клиент, PHP API, Canvas-карта и мини-игра</li><li>Мастер install.php: сам импортирует MySQL и создаёт config.local.php</li><li>31 таблица, начальные данные и администратор без ручного импорта</li><li>Только PHP/MySQL — без исходников Next.js и Node.js</li></ul><p className="adm-hint">{size(archives.php?.bytes)}{archives.php?.updatedAt ? ` · ${new Date(archives.php.updatedAt).toLocaleString("ru-RU")}` : ""}</p><a className="adm-btn adm-btn-primary" href={`${endpoint}?type=php`} download="valley-php.zip"><SvgIcon icon={Download} size={16} />Скачать PHP-версию</a></article>
      </div>
    </Card>
    <Card title="Что входит в PHP-пакет" subtitle="Отдельный серверный API, а не ссылка на Next.js">
      <div className="adm-kv"><div><span>Сервер</span><strong>PHP 8.1+ / PDO MySQL</strong></div><div><span>Клиент</span><strong>AJAX без сборки</strong></div><div><span>Карта</span><strong>Canvas + мягкое движение</strong></div><div><span>Графика</span><strong>Все текущие изображения и иконки</strong></div><div><span>Данные</span><strong>MySQL 8+ / MariaDB 10.6+</strong></div><div><span>Запуск</span><strong>Apache или php -S с router.php</strong></div></div>
      <p className="adm-hint"><SvgIcon icon={Package} size={15} /> {isPhp ? "PHP-админка пересобирает автономный PHP-архив (нужно php-zip). Архив Next.js доступен только там, где установлены исходники Next.js или отдельно загружен valley-next.zip." : "Кнопка «Обновить архивы» создаёт два независимых ZIP: исходники Next.js отдельно, готовый PHP-сайт отдельно."}</p>
      <p className="adm-hint"><SvgIcon icon={Smartphone} size={15} /> Архивы независимы: для Next.js нужен PostgreSQL, для PHP — MySQL. Установка PHP описана в README-PHP.md. Прогресс игроков и загруженные картинки из БД переносите отдельной резервной копией.</p>
    </Card>
  </div>;
}
