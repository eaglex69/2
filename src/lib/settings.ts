import { db } from "@/db";
import { gameSettings } from "@/db/schema";

export type Settings = {
  registrationOpen: boolean;
  maintenance: boolean;
  maintenanceText: string;
  chatEnabled: boolean;
  banner: string;
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(gameSettings);
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    registrationOpen: map.get("registration_open") !== "0",
    maintenance: map.get("maintenance") === "1",
    maintenanceText: map.get("maintenance_text") ?? "",
    chatEnabled: map.get("chat_enabled") !== "0",
    banner: map.get("banner") ?? "",
  };
}

export async function setSetting(key: string, value: string) {
  await db.insert(gameSettings).values({ key, value }).onConflictDoUpdate({ target: gameSettings.key, set: { value } });
}
