"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  AlignCenter, Bold, Code, Eraser, Eye, EyeOff, Image as ImageIcon, Italic, Link2, Palette,
  Quote, Strikethrough, Type, Underline,
} from "lucide-react";

type Open = { tag: string; arg?: string; children: BBNode[] };
type BBNode = string | Open;

const TAGS = new Set(["b", "i", "u", "s", "color", "size", "url", "img", "quote", "spoiler", "code", "center"]);
const COLORS = new Set(["red", "green", "blue", "orange", "purple", "pink", "brown", "gold", "gray", "black", "teal", "white"]);
const SWATCHES = ["#d6312f", "#f08a1f", "#e8b923", "#3f9c33", "#2f8fde", "#8a4fd0", "#e0529c", "#7b4a1e", "#555555"];

export function stripBB(text: string) {
  return text.replace(/\[\/?[a-zA-Z]+(?:=[^\]\n]{0,120})?\]/g, "");
}

function parse(src: string): BBNode[] {
  const root: Open = { tag: "root", children: [] };
  const stack: Open[] = [root];
  const re = /\[(\/?)([a-zA-Z]+)(?:=([^\]\n]{0,120}))?\]/g;
  let last = 0;
  let count = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src)) !== null) {
    const [full, close, rawTag, arg] = match;
    const tag = rawTag.toLowerCase();
    if (!TAGS.has(tag)) continue;
    if (match.index > last) stack[stack.length - 1].children.push(src.slice(last, match.index));
    last = match.index + full.length;
    if (close) {
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
    } else if (stack.length < 8 && count < 200) {
      count += 1;
      const node: Open = { tag, arg, children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    } else {
      stack[stack.length - 1].children.push(full);
    }
  }
  if (last < src.length) stack[stack.length - 1].children.push(src.slice(last));
  return root.children;
}

function safeUrl(value: string) {
  const v = value.trim();
  return /^https?:\/\/[^\s"'<>]{3,300}$/i.test(v) ? v : null;
}

function textOf(nodes: BBNode[]): string {
  return nodes.map((node) => (typeof node === "string" ? node : textOf(node.children))).join("");
}

function Spoiler({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <span className={`bb-spoiler ${open ? "open" : ""}`} role="button" tabIndex={0} onClick={() => setOpen(!open)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setOpen(!open); }}>{children}</span>;
}

function render(nodes: BBNode[], path: string): ReactNode[] {
  return nodes.map((node, index) => {
    if (typeof node === "string") return node;
    const key = `${path}.${index}`;
    const kids = render(node.children, key);
    const arg = (node.arg ?? "").trim().toLowerCase();
    switch (node.tag) {
      case "b": return <strong key={key}>{kids}</strong>;
      case "i": return <em key={key}>{kids}</em>;
      case "u": return <span key={key} style={{ textDecoration: "underline" }}>{kids}</span>;
      case "s": return <s key={key}>{kids}</s>;
      case "color": {
        const ok = /^#[0-9a-f]{3,6}$/.test(arg) || COLORS.has(arg);
        return <span key={key} style={ok ? { color: arg } : undefined}>{kids}</span>;
      }
      case "size": {
        const named: Record<string, string> = { small: "0.85em", large: "1.25em", huge: "1.6em" };
        const num = Number(arg);
        const size = named[arg] ?? (num >= 10 && num <= 28 ? `${num}px` : undefined);
        return <span key={key} style={size ? { fontSize: size } : undefined}>{kids}</span>;
      }
      case "url": {
        const href = safeUrl(node.arg ?? textOf(node.children));
        return href ? <a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer">{kids}</a> : <span key={key}>{kids}</span>;
      }
      case "img": {
        const src = safeUrl(textOf(node.children));
        // eslint-disable-next-line @next/next/no-img-element
        return src && src.startsWith("https://") ? <img key={key} src={src} alt="Изображение из сообщения" loading="lazy" referrerPolicy="no-referrer" /> : <span key={key}>{kids}</span>;
      }
      case "quote": return <blockquote key={key} className="bb-quote">{kids}</blockquote>;
      case "spoiler": return <Spoiler key={key}>{kids}</Spoiler>;
      case "code": return <code key={key}>{kids}</code>;
      case "center": return <div key={key} className="bb-center">{kids}</div>;
      default: return <span key={key}>{kids}</span>;
    }
  });
}

// Безопасный рендер BB-кодов без dangerouslySetInnerHTML.
export function BBText({ text }: { text: string }) {
  return <div className="bb-text">{render(parse(text), "bb")}</div>;
}

export function BBEditor({ value, onChange, onEnter, placeholder, maxLength, rows = 2, children }: {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [menu, setMenu] = useState<"color" | "size" | null>(null);
  const [preview, setPreview] = useState(false);

  function edit(open: string, close: string, fallback: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const inner = value.slice(start, end) || fallback;
    const next = value.slice(0, start) + open + inner + close + value.slice(end);
    if (maxLength && next.length > maxLength) return;
    onChange(next);
    setMenu(null);
    requestAnimationFrame(() => {
      el?.focus();
      const from = start + open.length;
      el?.setSelectionRange(from, from + inner.length);
    });
  }

  const buttons = [
    { label: "Жирный", Icon: Bold, run: () => edit("[b]", "[/b]", "текст") },
    { label: "Курсив", Icon: Italic, run: () => edit("[i]", "[/i]", "текст") },
    { label: "Подчёркнутый", Icon: Underline, run: () => edit("[u]", "[/u]", "текст") },
    { label: "Зачёркнутый", Icon: Strikethrough, run: () => edit("[s]", "[/s]", "текст") },
    { label: "Цвет", Icon: Palette, run: () => setMenu(menu === "color" ? null : "color") },
    { label: "Размер", Icon: Type, run: () => setMenu(menu === "size" ? null : "size") },
    { label: "Ссылка", Icon: Link2, run: () => edit("[url=https://example.com]", "[/url]", "ссылка") },
    { label: "Картинка (https)", Icon: ImageIcon, run: () => edit("[img]", "[/img]", "https://") },
    { label: "Цитата", Icon: Quote, run: () => edit("[quote]", "[/quote]", "цитата") },
    { label: "Спойлер", Icon: EyeOff, run: () => edit("[spoiler]", "[/spoiler]", "скрытый текст") },
    { label: "Код", Icon: Code, run: () => edit("[code]", "[/code]", "код") },
    { label: "По центру", Icon: AlignCenter, run: () => edit("[center]", "[/center]", "текст") },
    { label: "Убрать форматирование", Icon: Eraser, run: () => onChange(stripBB(value)) },
    { label: preview ? "Скрыть предпросмотр" : "Предпросмотр", Icon: Eye, run: () => setPreview(!preview) },
  ];

  return (
    <div className="bb-editor">
      <div className="bb-toolbar" role="toolbar" aria-label="BB-коды">
        {buttons.map(({ label, Icon, run }) => <button type="button" key={label} title={label} aria-label={label} onClick={run}><Icon size={16} /></button>)}
      </div>
      {menu === "color" && <div className="bb-menu">{SWATCHES.map((color) => <button type="button" key={color} className="bb-swatch" style={{ background: color }} aria-label={`Цвет ${color}`} onClick={() => edit(`[color=${color}]`, "[/color]", "текст")} />)}</div>}
      {menu === "size" && <div className="bb-menu">{[["small", "Мелкий"], ["large", "Крупный"], ["huge", "Огромный"]].map(([size, label]) => <button type="button" key={size} className="bb-size-btn" onClick={() => edit(`[size=${size}]`, "[/size]", "текст")}>{label}</button>)}</div>}
      <div className="bb-row">
        <textarea
          ref={ref}
          value={value}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => { if (onEnter && event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onEnter(); } }}
        />
        {children}
      </div>
      {preview && <div className="bb-preview"><BBText text={value || "Здесь появится предпросмотр"} /></div>}
    </div>
  );
}
