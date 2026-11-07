"use client";

import { useRef, useState } from "react";
import { Gem, Upload } from "lucide-react";
import { ANIMALS, CROPS } from "@/lib/game-config";
import { cropSquare } from "@/lib/image";
import { GENDERS, PLAYTIME, SEEKING, labelOf, type ProfileFields } from "@/lib/profile-fields";
import type { GamePayload } from "./game-types";
import { Avatar, Button, Modal } from "./game-ui";
import { SvgIcon } from "./svg-icons";

type ActFn = (action: Record<string, unknown>) => Promise<boolean>;

export function AvatarUploadModal({ payload, busy, act, onClose }: { payload: GamePayload; busy: boolean; act: ActFn; onClose: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    try { setPreview(await cropSquare(file, 256)); } catch { setError("Не удалось прочитать картинку. Выберите JPG или PNG."); }
  }

  return <Modal title="Свой аватар" onClose={onClose}>
    <div className="avatar-upload">
      <div className="avatar-upload-preview">
        {preview
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={preview} alt="Предпросмотр аватара" />
          : <Avatar name={payload.user.avatar} size={132} />}
      </div>
      <p className="muted center">Выберите любое фото или рисунок — оно будет обрезано до квадрата по центру. Стоимость установки — <strong>3 алмаза</strong> (у вас {payload.state.gems}). Замена картинки позже тоже стоит 3 алмаза.</p>
      {error && <div className="form-error">{error}</div>}
      <input ref={input} type="file" accept="image/*" hidden onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
      <Button variant="soft" onClick={() => input.current?.click()}><SvgIcon icon={Upload} size={16} />{preview ? "Выбрать другой файл" : "Выбрать файл"}</Button>
      <Button disabled={busy || !preview || payload.state.gems < 3} onClick={async () => { if (preview && await act({ type: "avatar-upload", data: preview })) onClose(); }}><SvgIcon icon={Gem} size={16} />Установить за 3 алмаза</Button>
    </div>
  </Modal>;
}

export function ProfileFacts({ profile }: { profile?: ProfileFields }) {
  if (!profile) return null;
  const rows: [string, string][] = [];
  if (profile.gender) rows.push(["Пол", labelOf(GENDERS, profile.gender)]);
  if (profile.age) rows.push(["Возраст", String(profile.age)]);
  if (profile.city) rows.push(["Город", profile.city]);
  if (profile.hobbies) rows.push(["Увлечения", profile.hobbies]);
  if (profile.favoriteCrop) rows.push(["Любимая культура", CROPS[profile.favoriteCrop]?.name ?? profile.favoriteCrop]);
  if (profile.favoriteAnimal) rows.push(["Любимое животное", ANIMALS[profile.favoriteAnimal as keyof typeof ANIMALS]?.name ?? profile.favoriteAnimal]);
  if (profile.motto) rows.push(["Девиз", profile.motto]);
  if (profile.seeking) rows.push(["Ищу", labelOf(SEEKING, profile.seeking)]);
  if (profile.playtime) rows.push(["Играю", labelOf(PLAYTIME, profile.playtime)]);
  if (profile.contacts) rows.push(["Контакты", profile.contacts]);
  if (!rows.length) return null;
  return <div className="profile-facts"><h3>Анкета</h3>{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

const FRAMES = [["wood", "Дерево"], ["gold", "Золото"], ["leaf", "Листва"], ["sky", "Небо"]];

export function EditProfileModal({ payload, busy, act, onClose }: { payload: GamePayload; busy: boolean; act: ActFn; onClose: () => void }) {
  const { user } = payload;
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio ?? "");
  const [frame, setFrame] = useState(user.profileFrame ?? "wood");
  const [profile, setProfile] = useState<ProfileFields>({ ...(user.profile ?? {}) });
  const set = (key: keyof ProfileFields, value: string | number) => setProfile((current) => ({ ...current, [key]: value }));
  const select = (key: keyof ProfileFields, list: readonly (readonly [string, string])[]) => (
    <select value={String(profile[key] ?? "")} onChange={(event) => set(key, event.target.value)}>{list.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
  );

  return <Modal title="Моя анкета" onClose={onClose}>
    <form className="form-stack profile-form" onSubmit={async (event) => { event.preventDefault(); if (await act({ type: "profile-update", displayName, bio, frame, profile })) onClose(); }}>
      <label><span>Имя фермера</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={32} required /></label>
      <label><span>Статус настроения</span><input value={profile.mood ?? ""} onChange={(event) => set("mood", event.target.value)} maxLength={50} placeholder="Например: собираю урожай" /></label>
      <label><span>О себе (видно всем)</span><textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={200} placeholder="Расскажите о своей ферме" /></label>
      <div className="form-grid two">
        <label><span>Пол</span>{select("gender", GENDERS)}</label>
        <label><span>Возраст</span><input type="number" min={6} max={99} value={profile.age || ""} onChange={(event) => set("age", Number(event.target.value))} placeholder="—" /></label>
      </div>
      <label><span>Город</span><input value={profile.city ?? ""} onChange={(event) => set("city", event.target.value)} maxLength={40} /></label>
      <label><span>Увлечения</span><input value={profile.hobbies ?? ""} onChange={(event) => set("hobbies", event.target.value)} maxLength={120} placeholder="Рыбалка, садоводство, шахматы" /></label>
      <div className="form-grid two">
        <label><span>Любимая культура</span><select value={profile.favoriteCrop ?? ""} onChange={(event) => set("favoriteCrop", event.target.value)}><option value="">Не выбрана</option>{Object.entries(CROPS).map(([key, crop]) => <option value={key} key={key}>{crop.name}</option>)}</select></label>
        <label><span>Любимое животное</span><select value={profile.favoriteAnimal ?? ""} onChange={(event) => set("favoriteAnimal", event.target.value)}><option value="">Не выбрано</option>{Object.entries(ANIMALS).map(([key, animal]) => <option value={key} key={key}>{animal.name}</option>)}</select></label>
      </div>
      <label><span>Девиз</span><input value={profile.motto ?? ""} onChange={(event) => set("motto", event.target.value)} maxLength={80} /></label>
      <div className="form-grid two">
        <label><span>Ищу в игре</span>{select("seeking", SEEKING)}</label>
        <label><span>Когда играю</span>{select("playtime", PLAYTIME)}</label>
      </div>
      <label><span>Контакты (по желанию)</span><input value={profile.contacts ?? ""} onChange={(event) => set("contacts", event.target.value)} maxLength={60} placeholder="Telegram, Discord…" /></label>
      <span className="field-label">Рамка профиля</span>
      <div className="avatar-picker">{FRAMES.map(([key, name]) => <button type="button" className={`frame-choice frame-${key} ${frame === key ? "active" : ""}`} onClick={() => setFrame(key)} key={key}>{name}</button>)}</div>
      <Button type="submit" disabled={busy}>Сохранить анкету</Button>
    </form>
  </Modal>;
}
