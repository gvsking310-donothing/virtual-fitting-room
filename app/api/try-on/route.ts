import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AI_PROVIDER_COOKIE,
  generateTryOn,
  getDefaultProvider,
  normalizeProvider,
} from "@/lib/tryon-provider";

type TryOnRequest = {
  user_photo_url?: string;
  clothing_image_url?: string;
  clothing_category?: string;
  job_id?: string;
};

function getReplicateDebugInfo() {
  const token = process.env.REPLICATE_API_TOKEN ?? "";

  return {
    hasToken: token.length > 0,
    tokenPrefix: token.slice(0, 3),
    tokenLength: token.length,
  };
}

function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

async function updateTryOnJob(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  jobId: string,
  values: Record<string, boolean | string | null>,
) {
  const { error } = await supabase
    .from("try_on_jobs")
    .update(values)
    .eq("id", jobId);

  if (!error) {
    return;
  }

  if (isProviderColumnError(error)) {
    const {
      actual_provider: _actualProvider,
      provider: _provider,
      provider_fallback_reason: _providerFallbackReason,
      provider_was_queued: _providerWasQueued,
      ...legacyValues
    } = values;
    const { error: legacyError } = await supabase
      .from("try_on_jobs")
      .update(legacyValues)
      .eq("id", jobId);

    if (!legacyError) {
      return;
    }

    throw legacyError;
  }

  throw error;
}

function isProviderColumnError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";

  return (
    error.code === "PGRST204" &&
    (message.includes("provider") ||
      message.includes("actual_provider") ||
      message.includes("provider_fallback_reason") ||
      message.includes("provider_was_queued"))
  );
}

export async function POST(request: Request) {
  const replicateDebug = getReplicateDebugInfo();
  const cookieStore = await cookies();
  const selectedProvider = normalizeProvider(
    cookieStore.get(AI_PROVIDER_COOKIE)?.value ?? getDefaultProvider(),
  );
  const body = (await request.json()) as TryOnRequest;
  const {
    clothing_category: clothingCategory,
    clothing_image_url: clothingImageUrl,
    job_id: jobId,
    user_photo_url: userPhotoUrl,
  } = body;

  if (!jobId || !userPhotoUrl || !clothingImageUrl) {
    return NextResponse.json(
      { error: "job_id, user_photo_url and clothing_image_url are required." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();

  try {
    try {
      await updateTryOnJob(supabase, jobId, {
        status: "processing",
        error_message: null,
        provider: selectedProvider,
        actual_provider: null,
        provider_fallback_reason: null,
        provider_was_queued: false,
      });
    } catch (processingError) {
      console.error("Supabase error:", processingError);
      throw processingError;
    }

    const result = await generateTryOn(
      userPhotoUrl,
      clothingImageUrl,
      clothingCategory ?? "上衣",
      selectedProvider,
    );

    try {
      await updateTryOnJob(supabase, jobId, {
        status: "done",
        result_image_url: result.result_image_url,
        error_message: result.fallback_reason ?? null,
        provider: selectedProvider,
        actual_provider: result.provider,
        provider_fallback_reason: result.fallback_reason ?? null,
        provider_was_queued: result.was_queued ?? false,
      });
    } catch (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    return NextResponse.json({
      ...result,
      selected_provider: selectedProvider,
      debug: replicateDebug,
    });
  } catch (error) {
    console.error("Try-on API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Try-on generation failed.";

    try {
      await updateTryOnJob(supabase, jobId, {
        status: "failed",
        error_message: errorMessage,
        provider: selectedProvider,
        actual_provider: null,
        provider_fallback_reason: null,
        provider_was_queued: false,
      });
    } catch (updateError) {
      console.error("Supabase try-on failure update error:", updateError);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        selected_provider: selectedProvider,
        debug: replicateDebug,
      },
      { status: 500 },
    );
  }
}
