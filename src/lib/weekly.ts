import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { mailMessages, weeklyRewards } from "@/db/schema";
import { WEEKLY_COOP_REWARDS, WEEKLY_FARMER_REWARDS, weekKey } from "./season";

let lastCheck = 0;

// Раздаёт награды топ-5 фермерам и кооперативам за каждую завершённую неделю (один раз).
export async function settleWeeklyRewards(now = Date.now(), force = false) {
  if (!force && now - lastCheck < 60_000) return;
  lastCheck = now;
  const current = weekKey(now);
  const pending = await db.execute(sql`select distinct week from weekly_scores where week < ${current} and week not in (select week from weekly_rewards) order by week`);
  for (const row of pending.rows as { week: string }[]) await settleWeek(row.week);
}

async function settleWeek(week: string) {
  await db.transaction(async (tx) => {
    const claimed = await tx.insert(weeklyRewards).values({ week, summary: {} }).onConflictDoNothing().returning({ week: weeklyRewards.week });
    if (!claimed.length) return;

    const farmers = (await tx.execute(sql`select s.user_id as id, u.display_name as name, s.points
      from weekly_scores s join users u on u.id = s.user_id
      where s.week = ${week} and s.points > 0 and u.banned_at is null and u.role <> 'admin'
      order by s.points desc, s.user_id asc limit 5`)).rows as { id: number; name: string; points: number }[];

    const coops = (await tx.execute(sql`select c.id, c.name, c.tag, sum(s.points)::int as points
      from coops c join coop_members m on m.coop_id = c.id join weekly_scores s on s.user_id = m.user_id and s.week = ${week}
      group by c.id having sum(s.points) > 0 order by points desc, c.id asc limit 5`)).rows as { id: number; name: string; tag: string; points: number }[];

    for (let i = 0; i < farmers.length; i += 1) {
      const reward = WEEKLY_FARMER_REWARDS[i];
      await tx.insert(mailMessages).values({
        recipientId: farmers[i].id,
        subject: `Награда недели: ${i + 1} место среди фермеров`,
        body: `Поздравляем! Вы заняли ${i + 1} место в недельном рейтинге фермеров (${week}) с результатом ${farmers[i].points} очков. Заберите подарок во вложении.`,
        kind: "gift",
        payload: reward,
      });
    }

    for (let i = 0; i < coops.length; i += 1) {
      const reward = WEEKLY_COOP_REWARDS[i];
      const members = (await tx.execute(sql`select user_id as id from coop_members where coop_id = ${coops[i].id}`)).rows as { id: number }[];
      if (members.length) {
        await tx.insert(mailMessages).values(members.map((member) => ({
          recipientId: member.id,
          subject: `Награда недели: кооператив на ${i + 1} месте`,
          body: `Ваш кооператив «${coops[i].name}» занял ${i + 1} место в недельном рейтинге (${week}). Каждому участнику — подарок во вложении.`,
          kind: "gift",
          payload: reward,
        })));
      }
    }

    await tx.update(weeklyRewards).set({
      summary: {
        farmers: farmers.map((f, i) => ({ id: f.id, name: f.name, rank: i + 1, points: f.points })),
        coops: coops.map((c, i) => ({ id: c.id, name: c.name, tag: c.tag, rank: i + 1, points: c.points })),
      },
    }).where(eq(weeklyRewards.week, week));
  });
}
