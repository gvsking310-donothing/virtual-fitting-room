import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type TryOnRequest = {
  user_photo_url?: string;
  clothing_image_url?: string;
  job_id?: string;
};

async function generateTryOn(userPhoto: string, clothingPhoto: string) {
  void userPhoto;
  void clothingPhoto;

  return {
    result_image_url: "https://placehold.co/600x900?text=AI+Try+On+Result",
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

export async function POST(request: Request) {
  const body = (await request.json()) as TryOnRequest;
  const { clothing_image_url: clothingImageUrl, job_id: jobId, user_photo_url: userPhotoUrl } = body;

  if (!jobId || !userPhotoUrl || !clothingImageUrl) {
    return NextResponse.json(
      { error: "job_id, user_photo_url and clothing_image_url are required." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();

  try {
    const result = await generateTryOn(userPhotoUrl, clothingImageUrl);

    const { error } = await supabase
      .from("try_on_jobs")
      .update({
        status: "done",
        result_image_url: result.result_image_url,
      })
      .eq("id", jobId);

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Try-on API error:", error);

    await supabase
      .from("try_on_jobs")
      .update({
        status: "failed",
      })
      .eq("id", jobId);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Try-on generation failed." },
      { status: 500 },
    );
  }
}
