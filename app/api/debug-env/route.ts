import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.REPLICATE_API_TOKEN ?? "";

  return NextResponse.json({
    provider: process.env.TRYON_PROVIDER ?? "mock",
    hasReplicateToken: token.length > 0,
    tokenPrefix: token.slice(0, 3),
    tokenLength: token.length,
  });
}
