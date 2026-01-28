import { NextResponse } from "next/server";
import { getLocaleSetting } from "@/lib/settings-storage";

export const runtime = "nodejs";

// ✅ 改为请求内部
export async function GET(req: Request) {
  const settings = await getSettings();
  return new Response(JSON.stringify({ locale: settings.locale }));
}
