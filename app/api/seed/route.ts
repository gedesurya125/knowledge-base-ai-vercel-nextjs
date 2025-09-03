import { loadData } from "@/lib/db/seeds";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const secret = searchParams.get("secret");
  const forceReplace = searchParams.get("force-replace");
  const definedSecret = process.env.SEED_SECRET;

  if (process.env.SEED_SECRET && secret !== definedSecret)
    return NextResponse.json({ message: "Unauthorized" });

  const data = await loadData({ forceReplace: forceReplace === "true" });
  return NextResponse.json({ forceReplace, data });
}
