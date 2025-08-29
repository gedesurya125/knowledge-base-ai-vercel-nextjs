import { loadData } from "@/lib/db/seeds";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const secret = searchParams.get("secret");
  const definedSecret = process.env.SEED_SECRET;

  if (process.env.SEED_SECRET && secret !== definedSecret)
    return NextResponse.json({ message: "Unauthorized" });

  const data = await loadData();
  return NextResponse.json({ data });
}
