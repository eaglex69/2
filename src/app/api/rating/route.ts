import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { weekKey } from "@/lib/season";
import { settleWeeklyRewards } from "@/lib/weekly";

export const dynamic = "force-dynamic";

const score = `(coalesce((f.data->'stats'->>'harvested')::bigint,0)*5 + coalesce((f.data->'stats'->>'fishCaught')::bigint,0)*4 + coalesce((f.data->'stats'->>'mined')::bigint,0)*3 + coalesce((f.data->'stats'->>'produced')::bigint,0)*6 + coalesce((f.data->'stats'->>'orders')::bigint,0)*20 + coalesce((f.data->'stats'->>'earned')::bigint,0)/20)`;
const totalXp = `(((coalesce((f.data->>'level')::int,1)-1)*(120+45*(coalesce((f.data->>'level')::int,1)-2))/2)::int + coalesce((f.data->>'xp')::int,0))`;

export async function GET() {
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Нужно войти"},{status:401});
 if(user.bannedAt)return NextResponse.json({error:"Аккаунт заблокирован"},{status:403});
 try {
  await settleWeeklyRewards().catch(()=>undefined);
  const week=weekKey(Date.now());
  // Нулевые очки и администраторы остаются видимыми. Награды по-прежнему получают только игроки.
  const farmerFields=sql`u.id,u.display_name as "displayName",u.avatar,u.role,coalesce((f.data->>'level')::int,1) as level,(select c.tag from coop_members m join coops c on c.id=m.coop_id where m.user_id=u.id) as tag`;
  const weekPoints=sql`greatest(0,${sql.raw(score)}-case when f.data->'weekly'->>'week'=${week} then coalesce((f.data->'weekly'->>'base')::bigint,0) else ${sql.raw(score)} end)::bigint as points`;
  const farmerQuery=(points:ReturnType<typeof sql>,order:ReturnType<typeof sql>)=>sql`with ranked as (
   select raw.*,row_number() over(order by ${order})::int as place,count(*) over()::int as total from (select ${farmerFields},${points} from users u left join farm_states f on f.user_id=u.id where u.banned_at is null) raw
  ) select * from ranked where place<=100 or id=${user.id} order by place`;
  const coopQuery=(points:ReturnType<typeof sql>)=>sql`with ranked as (
   select raw.*,row_number() over(order by points desc,id)::int as place,count(*) over()::int as total from (select c.id,c.name,c.tag,c.icon,${points} as points,(select count(*) from coop_members m where m.coop_id=c.id)::int as members from coops c) raw
  ) select * from ranked order by place limit 100`;
  const [fw,fa,cw,ca,last,myCoop]=await Promise.all([
   db.execute(farmerQuery(weekPoints,sql`points desc,id`)),
   db.execute(farmerQuery(sql`${sql.raw(totalXp)} as points`,sql`level desc,points desc,id`)),
   db.execute(coopQuery(sql`coalesce((select sum(greatest(0,${sql.raw(score)}-case when f.data->'weekly'->>'week'=${week} then coalesce((f.data->'weekly'->>'base')::bigint,0) else ${sql.raw(score)} end)) from coop_members m join farm_states f on f.user_id=m.user_id where m.coop_id=c.id),0)::bigint`)),
   db.execute(coopQuery(sql`c.xp::bigint`)),
   db.execute(sql`select week,summary from weekly_rewards where summary<>'{}'::jsonb order by week desc limit 1`),
   db.execute(sql`select coop_id from coop_members where user_id=${user.id}`),
  ]);
  const normalize=(rows:Record<string,unknown>[])=>rows.map(r=>({...r,id:Number(r.id),level:Number(r.level??1),points:Number(r.points),place:Number(r.place),total:Number(r.total),members:Number(r.members??0)}));
  const farmersWeek=normalize(fw.rows),farmersAll=normalize(fa.rows),coopsWeek=normalize(cw.rows),coopsAll=normalize(ca.rows);
  const mine=farmersWeek.find(r=>r.id===user.id)??null;
  return NextResponse.json({week,farmersWeek,farmersAll,coopsWeek,coopsAll,me:mine,myRank:mine?.place??null,myPoints:mine?.points??0,totalFarmers:mine?.total??farmersWeek.length,myCoopId:Number(myCoop.rows[0]?.coop_id??0)||null,last:last.rows[0]??null,serverTime:Date.now()},{headers:{"Cache-Control":"no-store"}});
 }catch(error){console.error("Rating failed",error);return NextResponse.json({error:"Не удалось загрузить рейтинги. Попробуйте ещё раз."},{status:500});}
}
