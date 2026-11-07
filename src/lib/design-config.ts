// Клиентобезопасная часть системы оформления: типы, слоты графики, генерация CSS.
export type HudLayout = {
  dock: string[];
  left: string[];
  right: string[];
};

export const HUD_ITEMS: { key: string; label: string; art: string }[] = [
  { key: "shop", label: "Магазин", art: "shop" },
  { key: "city", label: "Заказы", art: "orders" },
  { key: "garden", label: "Огород", art: "map" },
  { key: "ponds", label: "Водоёмы", art: "pond" },
  { key: "pens", label: "Загоны", art: "duck" },
  { key: "cellar", label: "Погреб", art: "book" },
  { key: "mines", label: "Шахты", art: "pickaxe" },
  { key: "diamond", label: "Алмазная", art: "gem" },
  { key: "jobs", label: "Работа", art: "orders" },
  { key: "barn", label: "Амбар", art: "backpack" },
  { key: "market", label: "Рынок", art: "sale" },
  { key: "bank", label: "Банк", art: "pig" },
  { key: "wheel", label: "Колесо", art: "wheel" },
  { key: "lottery", label: "Лотереи", art: "gift" },
  { key: "build", label: "Стройка", art: "backpack" },
  { key: "pvz", label: "Зомби", art: "zombie" },
  { key: "season", label: "Сезон", art: "trophy" },
  { key: "rating", label: "Рейтинг", art: "trophy" },
  { key: "coop", label: "Кооператив", art: "sunflower" },
  { key: "workers", label: "Работники", art: "joystick" },
  { key: "chat", label: "Чат", art: "chat" },
  { key: "forum", label: "Форум", art: "book" },
  { key: "newspaper", label: "Газета", art: "book" },
  { key: "mail", label: "Почта", art: "mail" },
  { key: "friends", label: "Друзья", art: "book" },
  { key: "promos", label: "Подарок / Акции", art: "gift" },
  { key: "news", label: "Новости", art: "book" },
  { key: "elysium", label: "Элизиум", art: "wand" },
  { key: "tickets", label: "Обращения", art: "mail" },
  { key: "profile", label: "Профиль", art: "sunflower" },
];

export const DEFAULT_LAYOUT: HudLayout = {
  dock: ["shop", "city", "garden", "ponds", "chat", "wheel", "lottery", "build", "pvz", "rating", "workers", "mail", "promos", "barn", "friends"],
  left: ["chat", "promos", "city", "garden"],
  right: ["bank", "season", "promos", "news"],
};

export function sanitizeLayout(raw: unknown): HudLayout {
  const valid = new Set(HUD_ITEMS.map((item) => item.key));
  const src = (raw && typeof raw === "object" ? raw : {}) as Partial<HudLayout>;
  const pick = (list: unknown, fallback: string[]) => {
    if (!Array.isArray(list)) return [...fallback];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of list) {
      if (typeof item === "string" && valid.has(item) && !seen.has(item)) { seen.add(item); out.push(item); }
    }
    return out;
  };
  return {
    dock: pick(src.dock, DEFAULT_LAYOUT.dock),
    left: pick(src.left, DEFAULT_LAYOUT.left),
    right: pick(src.right, DEFAULT_LAYOUT.right),
  };
}

export type Design = {
  colors: { primary: string; secondary: string; panel: string; text: string; accent: string; background: string };
  slots: Record<string, string>;
  icons: Record<string, string>;
  radius: number;
  css: string;
  logoText: string;
  logoSub: string;
  fonts: Record<string, string>;
  moduleFonts: Record<string, string>;
  fontUrl: string;
  fontName: string;
  layout: HudLayout;
};

export const FONT_STACKS: Record<string, string> = {
  default: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
  rounded: '"Arial Rounded MT Bold", "Trebuchet MS", "Segoe UI", sans-serif',
  sans: 'Arial, Helvetica, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", Courier, monospace',
  handwritten: '"Comic Sans MS", "Bradley Hand", cursive',
  custom: '"ValleyCustom", "Trebuchet MS", sans-serif',
};
export const FONT_OPTIONS = [
  ["default", "Основной Trebuchet"], ["rounded", "Скруглённый"], ["sans", "Arial / Sans"], ["serif", "Georgia / Serif"], ["mono", "Моноширинный"], ["handwritten", "Рукописный"], ["custom", "Свой загруженный шрифт"],
] as const;
export const FONT_SCOPES = [
  ["global", "Весь сайт (базовый)"], ["map", "Главная карта и HUD"], ["modules", "Разделы игры"], ["headings", "Заголовки и логотип"], ["buttons", "Кнопки и панели"], ["chat", "Чат и BB-редактор"], ["admin", "Админ-панель"], ["auth", "Экран входа"], ["loading", "Экран загрузки"],
] as const;
export const FONT_MODULE_LABELS: Record<string, string> = {
  garden: "Огород", ponds: "Пруды", pens: "Загоны", cages: "Садок", cellar: "Погреб", mines: "Шахты", fishing: "Рыбалка", diamond: "Алмазная", jobs: "Работа", barn: "Амбар", market: "Рынок", shop: "Магазин", city: "Город", news: "Новости", promos: "Акции", elysium: "Элизиум", forum: "Форум", chat: "Чат", newspaper: "Газета", tickets: "Обращения", mail: "Почта", friends: "Друзья", profile: "Профиль", coop: "Кооператив", workers: "Работники", rating: "Рейтинги", season: "Сезонный пропуск", bank: "Банк",
};
export const DEFAULT_FONTS: Record<string, string> = Object.fromEntries(FONT_SCOPES.map(([key]) => [key, "default"]));

export const DEFAULT_DESIGN: Design = {
  colors: { primary: "#6cc744", secondary: "#ffcb5c", panel: "#fffbee", text: "#3d2f1e", accent: "#2f8fde", background: "#67bf49" },
  slots: {},
  icons: {},
  radius: 18,
  css: "",
  logoText: "Тихая долина",
  logoSub: "Онлайн-ферма",
  fonts: { ...DEFAULT_FONTS },
  moduleFonts: {},
  fontUrl: "",
  fontName: "ValleyCustom",
  layout: { ...DEFAULT_LAYOUT },
};

export type SlotDef = { key: string; label: string; group: string; selector: string; size?: string };

export const DESIGN_SLOT_DEFS: SlotDef[] = [
  { key: "loading", label: "Экран загрузки", group: "Сцены", selector: ".loading-bg" },
  { key: "login", label: "Экран входа", group: "Сцены", selector: ".auth-screen.auth-bg" },
  { key: "map", label: "Карта фермы (главный экран)", group: "Сцены", selector: ".farm-map-bg" },
  { key: "moduleBg", label: "Фон внутренних разделов", group: "Сцены", selector: ".game-shell:not(.on-map)" },
  { key: "garden", label: "Баннер: Огород", group: "Сцены", selector: ".garden-scene" },
  { key: "pens", label: "Баннер: Загоны", group: "Сцены", selector: ".pen-scene" },
  { key: "pond", label: "Баннер: Пруды и садок", group: "Сцены", selector: ".water-scene" },
  { key: "market", label: "Баннер: Рынок, магазин, город, погреб, работа", group: "Сцены", selector: ".shop-scene, .city-scene, .job-scene, .cellar-scene" },
  { key: "mine", label: "Баннер: Шахты", group: "Сцены", selector: ".mine-scene" },
  { key: "lake", label: "Баннер: Рыбалка", group: "Сцены", selector: ".fishing-scene" },
  { key: "news", label: "Баннер: Новости, кооператив, работники", group: "Сцены", selector: ".news-scene, .coop-scene, .workers-scene, .ticket-scene" },
  { key: "promo", label: "Баннер: Акции", group: "Сцены", selector: ".promo-hero" },
  { key: "logo", label: "Логотип игры (заменяет текстовый)", group: "Логотип", selector: "" },
  { key: "header", label: "Шапка внутренних разделов", group: "Интерфейс", selector: ".game-header" },
  { key: "bottomNav", label: "Нижняя панель", group: "Интерфейс", selector: ".bottom-nav" },
  { key: "drawer", label: "Меню «Все разделы»", group: "Интерфейс", selector: ".module-drawer" },
  { key: "modal", label: "Всплывающие окна", group: "Интерфейс", selector: ".modal-sheet" },
  { key: "panel", label: "Карточки и панели", group: "Интерфейс", selector: ".panel, .water-card, .pen-card, .mine-card, .job-card, .news-card, .shop-card, .order-card, .inventory-card, .coop-card, .worker-card, .market-listing, .topic-row, .mail-card", size: "100% 100%" },
  { key: "plot", label: "Грядки", group: "Интерфейс", selector: ".plot-card", size: "cover" },
  { key: "btnPrimary", label: "Зелёные кнопки", group: "Интерфейс", selector: ".btn-primary", size: "100% 100%" },
  { key: "btnSecondary", label: "Жёлтые кнопки", group: "Интерфейс", selector: ".btn-secondary", size: "100% 100%" },
  { key: "btnSoft", label: "Светлые кнопки", group: "Интерфейс", selector: ".btn-soft, .icon-btn", size: "100% 100%" },
  { key: "toast", label: "Уведомления", group: "Интерфейс", selector: ".toast", size: "100% 100%" },
  { key: "hudPortrait", label: "HUD: рамка портрета", group: "HUD карты", selector: ".hud-portrait", size: "100% 100%" },
  { key: "hudBar", label: "HUD: полосы уровня и энергии", group: "HUD карты", selector: ".hud-bar-track", size: "100% 100%" },
  { key: "hudCurrency", label: "HUD: капсулы валют", group: "HUD карты", selector: ".hud-currency", size: "100% 100%" },
  { key: "hudSquare", label: "HUD: квадратные кнопки", group: "HUD карты", selector: ".hud-square", size: "100% 100%" },
  { key: "hudTile", label: "HUD: нижние плитки", group: "HUD карты", selector: ".hud-tile", size: "100% 100%" },
  { key: "mapPin", label: "Круглые пины на карте", group: "HUD карты", selector: ".map-pin-icon", size: "100% 100%" },
];

export const DESIGN_SLOTS: Record<string, string> = Object.fromEntries(DESIGN_SLOT_DEFS.map((def) => [def.key, def.label]));

const URL_RE = /^(\/api\/asset\/|\/images\/|https:\/\/)[^"'()\s<>\\]{1,300}$/;

export function sanitizeDesign(raw: unknown): Design {
  const source = (raw && typeof raw === "object" ? raw : {}) as Partial<Design>;
  const color = (value: unknown, fallback: string) => (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback);
  const colors = { ...DEFAULT_DESIGN.colors, ...(source.colors ?? {}) };
  const slots: Record<string, string> = {};
  if (source.slots && typeof source.slots === "object") {
    for (const [key, value] of Object.entries(source.slots)) {
      if (key in DESIGN_SLOTS && typeof value === "string" && URL_RE.test(value)) slots[key] = value;
    }
  }
  const icons: Record<string, string> = {};
  if (source.icons && typeof source.icons === "object") {
    for (const [key, value] of Object.entries(source.icons)) {
      if (/^[A-Za-z0-9:_.-]{1,60}$/.test(key) && typeof value === "string" && URL_RE.test(value)) icons[key] = value;
    }
  }
  const radius = Number(source.radius);
  const text = (value: unknown, fallback: string, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback);
  return {
    colors: {
      primary: color(colors.primary, DEFAULT_DESIGN.colors.primary),
      secondary: color(colors.secondary, DEFAULT_DESIGN.colors.secondary),
      panel: color(colors.panel, DEFAULT_DESIGN.colors.panel),
      text: color(colors.text, DEFAULT_DESIGN.colors.text),
      accent: color(colors.accent, DEFAULT_DESIGN.colors.accent),
      background: color(colors.background, DEFAULT_DESIGN.colors.background),
    },
    slots,
    icons,
    radius: Number.isFinite(radius) ? Math.max(0, Math.min(40, radius)) : DEFAULT_DESIGN.radius,
    css: typeof source.css === "string" ? source.css.replace(/<\/style/gi, "").replace(/javascript:/gi, "").slice(0, 20000) : "",
    logoText: text(source.logoText, DEFAULT_DESIGN.logoText, 30),
    logoSub: text(source.logoSub, DEFAULT_DESIGN.logoSub, 40),
    fonts: Object.fromEntries(FONT_SCOPES.map(([key]) => {
      const value = typeof source.fonts?.[key] === "string" ? source.fonts[key] : "default";
      return [key, value === "custom" || FONT_STACKS[value] ? value : "default"];
    })),
    moduleFonts: Object.fromEntries(Object.entries(source.moduleFonts ?? {}).filter(([key, value]) => key in FONT_MODULE_LABELS && typeof value === "string" && (value === "" || value === "custom" || !!FONT_STACKS[value])).map(([key, value]) => [key, value as string])),
    fontUrl: typeof source.fontUrl === "string" && URL_RE.test(source.fontUrl) ? source.fontUrl : "",
    fontName: typeof source.fontName === "string" && /^[A-Za-z0-9 _-]{2,40}$/.test(source.fontName) ? source.fontName : "ValleyCustom",
    layout: sanitizeLayout(source.layout),
  };
}

export function designCss(design: Design) {
  const c = design.colors;
  const out: string[] = [
    `:root{--green:${c.primary};--green-dark:${c.primary};--gold:${c.secondary};--paper:${c.panel};--ink:${c.text};--cream:${c.panel};--radius-game:${design.radius}px;}`,
    `body{background-color:${c.background};}`,
    `.btn-primary{background:linear-gradient(180deg,${c.primary},${c.primary}) !important;border-color:${c.primary} !important;}`,
    `.btn-secondary{background:linear-gradient(180deg,${c.secondary},${c.secondary}) !important;}`,
    `.panel,.plot-card,.water-card,.pen-card,.mine-card,.job-card,.news-card,.shop-card,.order-card,.market-listing,.inventory-card,.topic-row,.mail-card,.coop-card,.worker-card{background-color:${c.panel};}`,
    `.panel,.modal-sheet,.coop-card,.worker-card,.plot-card{border-radius:${design.radius}px !important;}`,
    `.bottom-nav button.active,.hud-square.blue,.module-heading>svg{background:linear-gradient(180deg,${c.accent},${c.accent}) !important;}`,
  ];
  for (const def of DESIGN_SLOT_DEFS) {
    const url = design.slots[def.key];
    if (!url || !def.selector) continue;
    out.push(`${def.selector}{background-image:url("${url}") !important;background-size:${def.size ?? "cover"} !important;background-position:center !important;background-repeat:no-repeat !important;}`);
  }
  if (design.fontUrl && design.fontName) out.push(`@font-face{font-family:"${design.fontName}";src:url("${design.fontUrl}");font-display:swap;}`);
  const family = (scope: string) => {
    const key = design.fonts[scope] ?? "default";
    if (key === "custom" && design.fontUrl && design.fontName) return `"${design.fontName}", ${FONT_STACKS.default}`;
    return FONT_STACKS[key] ?? FONT_STACKS.default;
  };
  const scopeSelectors: Record<string, string> = {
    global: "body", map: ".farm-map, .farm-map *", modules: ".module-content, .module-content *", headings: "h1, h2, h3, .game-logo, .logo-red, .logo-green, .logo-banner",
    buttons: ".btn, .hud-tile, .hud-square, .bottom-nav button, .hud-currency, .map-pin-label", chat: ".chat-module, .bb-editor, .coop-chat", admin: ".adm, .adm-denied, .adm *",
    auth: ".auth-screen, .auth-screen *", loading: ".loading-screen.splash, .loading-screen.splash *",
  };
  for (const [scope] of FONT_SCOPES) if (scopeSelectors[scope]) out.push(`${scopeSelectors[scope]}{font-family:${family(scope)}${scope === "global" ? "" : " !important"};}`);
  for (const [module, font] of Object.entries(design.moduleFonts)) {
    if (!font || !(module in FONT_MODULE_LABELS)) continue;
    const key = font === "custom" && design.fontUrl && design.fontName ? `"${design.fontName}", ${FONT_STACKS.default}` : FONT_STACKS[font] ?? FONT_STACKS.default;
    out.push(`.content-${module}, .content-${module} *{font-family:${key} !important;}`);
  }
  out.push(design.css);
  return out.join("\n");
}
