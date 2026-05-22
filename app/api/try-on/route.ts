import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createGarmentDescription, generateTryOn } from "@/lib/tryon-provider";

type TryOnRequest = {
  user_photo_url?: string;
  clothing_image_url?: string;
  clothing_category?: string;
  job_id?: string;
};

function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function POST(request: Request) {
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
    const { error: processingError } = await supabase
      .from("try_on_jobs")
      .update({
        status: "processing",
        error_message: null,
      })
      .eq("id", jobId);

    if (processingError) {
      console.error("Supabase error:", processingError);
      throw processingError;
    }

    const garmentDescription = createGarmentDescription(clothingCategory ?? "上衣");
    const result = await generateTryOn(
      userPhotoUrl,
      clothingImageUrl,
      garmentDescription,
      clothingCategory,
    );

    const { error } = await supabase
      .from("try_on_jobs")
      .update({
        status: "done",
        result_image_url: result.result_image_url,
        error_message: null,
      })
      .eq("id", jobId);

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Try-on API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Try-on generation failed.";

    await supabase
      .from("try_on_jobs")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", jobId);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
