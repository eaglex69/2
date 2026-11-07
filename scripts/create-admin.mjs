// Использование: node scripts/create-admin.mjs <логин> <пароль>
// Создаёт аккаунт администратора или повышает существующий до администратора.
import "dotenv/config";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 6) {
  console.error("Использование: node scripts/create-admin.mjs <логин> <пароль (от 6 символов)>");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const derived = await promisify(scrypt)(password, salt, 64);
const hash = `${salt}:${derived.toString("hex")}`;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const login = username.toLowerCase();
const existing = await client.query("select id from users where username = $1", [login]);
if (existing.rowCount) {
  await client.query("update users set role = 'admin', password_hash = $2, banned_at = null where username = $1", [login, hash]);
  console.log(`Пользователь ${login} повышен до администратора, пароль обновлён.`);
} else {
  await client.query("insert into users (username, display_name, password_hash, role) values ($1, $2, $3, 'admin')", [login, "Администратор", hash]);
  console.log(`Администратор ${login} создан.`);
}
await client.end();
