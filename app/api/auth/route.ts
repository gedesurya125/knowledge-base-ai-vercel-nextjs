import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body?.password)
    return NextResponse.json({
      isAuthenticated: body?.password === process.env.PASSWORD,
    });
}
