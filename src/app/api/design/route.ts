import { NextResponse } from "next/server";
import { designCss, getDesign } from "@/lib/design";

export const dynamic = "force-dynamic";

export async function GET() {
  const design = await getDesign();
  return NextResponse.json({ design, css: designCss(design) });
}
