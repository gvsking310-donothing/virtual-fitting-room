"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { getSupabaseErrorMessage } from "@/lib/supabase/errors";

type TryOnJob = {
  id: string;
  user_photo_url: string;
  clothing_image_url: string;
  status: "pending" | "processing" | "done" | "failed";
  result_image_url: string | null;
  error_message: string | null;
  created_at: string;
};

export default function TryOnResultClient() {
  const searchParams = useSearchParams();
  const [job, setJob] = useState<TryOnJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const jobId = searchParams.get("id");

    if (!jobId) {
      setMessage("缺少试穿任务 ID。");
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("请先在 Vercel 配置 Supabase 环境变量。");
      setIsLoading(false);
      return;
    }

    const supabaseClient = supabase;

    async function loadJob() {
      try {
        const { data, error } = await supabaseClient
          .from("try_on_jobs")
          .select(
            "id, user_photo_url, clothing_image_url, status, result_image_url, error_message, created_at",
          )
          .eq("id", jobId)
          .single();

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }

        setJob(data);
      } catch (error) {
        console.error("Supabase error:", error);
        setMessage(getSupabaseErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadJob();
    const intervalId = window.setInterval(loadJob, 2000);

    return () => window.clearInterval(intervalId);
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="mt-8 rounded-3xl bg-neutral-100 px-5 py-8 text-sm text-neutral-600">
        正在读取试穿任务...
      </div>
    );
  }

  if (!job) {
    return (
      <p className="mt-8 rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-600">
        {message || "暂无试穿任务，请返回选择衣服。"}
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      <article className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg shadow-neutral-200/70">
        <div className="relative min-h-96 bg-neutral-100">
          <img
            src={job.user_photo_url}
            alt="已选择的人物照片"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div className="p-4">
          <h2 className="text-sm font-semibold text-neutral-950">已选择的人物照片</h2>
        </div>
      </article>

      <article className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg shadow-neutral-200/70">
        <div className="relative aspect-[3/4] bg-neutral-100">
          <img
            src={job.clothing_image_url}
            alt="已选择的衣服图片"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="p-4">
          <h2 className="text-sm font-semibold text-neutral-950">已选择的衣服图片</h2>
        </div>
      </article>

      {job.status === "processing" || job.status === "pending" ? (
        <article className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-5 py-8 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-950" />
          <p className="mt-4 text-sm font-semibold text-neutral-950">AI试穿处理中...</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            正在生成试穿结果，完成后会自动显示图片。
          </p>
        </article>
      ) : job.status === "done" && job.result_image_url ? (
        <article className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg shadow-neutral-200/70">
          <div className="relative aspect-[2/3] bg-neutral-100">
            <img
              src={job.result_image_url}
              alt="AI试穿结果"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-4">
            <h2 className="text-sm font-semibold text-neutral-950">试穿结果</h2>
          </div>
        </article>
      ) : job.status === "done" ? (
        <article className="rounded-3xl border border-neutral-200 bg-neutral-50 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-neutral-950">暂无结果图</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            任务已完成，但没有返回可显示的图片地址。
          </p>
        </article>
      ) : job.status === "failed" ? (
        <article className="rounded-3xl border border-neutral-200 bg-neutral-50 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-neutral-950">AI试穿生成失败</p>
          <p className="mt-3 text-xs leading-5 text-neutral-500">
            {job.error_message || "Replicate 调用失败，请稍后重试。"}
          </p>
        </article>
      ) : (
        <article className="rounded-3xl border border-neutral-200 bg-neutral-50 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-neutral-950">暂无试穿状态</p>
        </article>
      )}
    </div>
  );
}
