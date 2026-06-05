import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AI_PROVIDER_COOKIE,
  getDefaultProvider,
  getProviderStatuses,
  normalizeProvider,
} from "@/lib/tryon-provider";

type ProviderRequest = {
  provider?: string;
};

export async function GET() {
  const cookieStore = await cookies();
  const currentProvider = normalizeProvider(
    cookieStore.get(AI_PROVIDER_COOKIE)?.value ?? getDefaultProvider(),
  );

  return NextResponse.json({
    currentProvider,
    providers: getProviderStatuses(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProviderRequest;
  const provider = normalizeProvider(body.provider);
  const cookieStore = await cookies();

  cookieStore.set(AI_PROVIDER_COOKIE, provider, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({
    currentProvider: provider,
    providers: getProviderStatuses(),
  });
}
