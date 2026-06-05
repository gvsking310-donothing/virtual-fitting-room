"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { getSupabaseErrorMessage } from "@/lib/supabase/errors";

type TryOnJob = {
  id: string;
  user_id: string | null;
  clothing_id: string | null;
  user_photo_url: string;
  clothing_image_url: string;
  status: "pending" | "processing" | "done" | "failed";
  result_image_url: string | null;
  error_message: string | null;
  is_favorite: boolean;
  created_at: string;
};

type TryOnHistoryClientProps = {
  favoritesOnly?: boolean;
};

const statusText: Record<TryOnJob["status"], string> = {
  pending: "等待中",
  processing: "处理中",
  done: "已完成",
  failed: "失败",
};

const jobSelect =
  "id, user_id, clothing_id, user_photo_url, clothing_image_url, status, result_image_url, error_message, is_favorite, created_at";

export default function TryOnHistoryClient({
  favoritesOnly = false,
}: TryOnHistoryClientProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<TryOnJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetryingId, setIsRetryingId] = useState("");
  const [message, setMessage] = useState("");

  async function loadJobs() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("请先在 Vercel 配置 Supabase 环境变量。");
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("try_on_jobs")
        .select(jobSelect)
        .order("created_at", { ascending: false });

      if (favoritesOnly) {
        query = query.eq("is_favorite", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase try-on jobs load error:", error);
        throw error;
      }

      setJobs(data ?? []);
      setMessage("");
    } catch (error) {
      console.error("Supabase try-on jobs load error:", error);
      setMessage(getSupabaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, [favoritesOnly]);

  async function toggleFavorite(job: TryOnJob) {
    if (!supabase) {
      setMessage("Supabase 未配置。");
      return;
    }

    try {
      const nextFavorite = !job.is_favorite;
      const { error } = await supabase
        .from("try_on_jobs")
        .update({ is_favorite: nextFavorite })
        .eq("id", job.id);

      if (error) {
        console.error("Supabase favorite update error:", error);
        throw error;
      }

      setJobs((current) =>
        favoritesOnly && !nextFavorite
          ? current.filter((item) => item.id !== job.id)
          : current.map((item) =>
              item.id === job.id ? { ...item, is_favorite: nextFavorite } : item,
            ),
      );
      setMessage(nextFavorite ? "已收藏。" : "已取消收藏。");
    } catch (error) {
      console.error("Supabase favorite update error:", error);
      setMessage(getSupabaseErrorMessage(error));
    }
  }

  async function deleteJob(job: TryOnJob) {
    if (!supabase) {
      setMessage("Supabase 未配置。");
      return;
    }

    try {
      const { error } = await supabase
        .from("try_on_jobs")
        .delete()
        .eq("id", job.id);

      if (error) {
        console.error("Supabase try-on job delete error:", error);
        throw error;
      }

      setJobs((current) => current.filter((item) => item.id !== job.id));
      setMessage("记录已删除。");
    } catch (error) {
      console.error("Supabase try-on job delete error:", error);
      setMessage(getSupabaseErrorMessage(error));
    }
  }

  async function retryJob(job: TryOnJob) {
    if (!supabase) {
      setMessage("Supabase 未配置。");
      return;
    }

    setIsRetryingId(job.id);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("try_on_jobs")
        .insert({
          user_id: job.user_id,
          clothing_id: job.clothing_id,
          user_photo_url: job.user_photo_url,
          clothing_image_url: job.clothing_image_url,
          status: "processing",
          is_favorite: false,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Supabase try-on retry insert error:", error);
        throw error;
      }

      const response = await fetch("/api/try-on", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_id: data.id,
          user_photo_url: job.user_photo_url,
          clothing_image_url: job.clothing_image_url,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "重新试穿失败。");
      }

      router.push(`/try-on/result?id=${data.id}`);
    } catch (error) {
      console.error("Try-on retry error:", error);
      setMessage(getSupabaseErrorMessage(error));
    } finally {
      setIsRetryingId("");
    }
  }

  if (isLoading) {
    return (
      <div className="mt-8 rounded-3xl bg-neutral-100 px-5 py-8 text-sm text-neutral-600">
        正在读取试穿记录...
      </div>
    );
  }

  if (message && jobs.length === 0) {
    return (
      <p className="mt-8 rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-700">
        {message}
      </p>
    );
  }

  if (jobs.length === 0) {
    return (
      <p className="mt-8 rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-600">
        {favoritesOnly ? "暂无收藏记录。" : "暂无试穿记录。"}
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {message ? (
        <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-700">
          {message}
        </p>
      ) : null}

      {jobs.map((job) => (
        <article
          key={job.id}
          className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg shadow-neutral-200/70"
        >
          <Link href={`/try-on/result?id=${job.id}`} className="block">
            <div className="grid grid-cols-3 gap-px bg-neutral-200">
              <div className="aspect-[3/4] bg-neutral-100">
                <img
                  src={job.user_photo_url}
                  alt="人物照片"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="aspect-[3/4] bg-neutral-100">
                <img
                  src={job.clothing_image_url}
                  alt="衣服图片"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="aspect-[3/4] bg-neutral-100">
                {job.status === "done" && job.result_image_url ? (
                  <img
                    src={job.result_image_url}
                    alt="试穿结果"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-center text-xs leading-5 text-neutral-500">
                    {job.status === "done"
                      ? "暂无结果图"
                      : job.status === "failed"
                        ? "生成失败"
                        : "结果生成中"}
                  </div>
                )}
              </div>
            </div>
          </Link>

          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-950">
                  AI试穿任务
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {new Date(job.created_at).toLocaleString("zh-CN")}
                </p>
                {job.status === "failed" && job.error_message ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-500">
                    {job.error_message}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                {job.is_favorite ? "已收藏 · " : ""}
                {statusText[job.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleFavorite(job)}
                className="h-11 rounded-full border border-neutral-200 text-sm font-medium text-neutral-950 transition active:scale-[0.98]"
              >
                {job.is_favorite ? "取消收藏" : "收藏"}
              </button>
              <button
                type="button"
                onClick={() => retryJob(job)}
                disabled={isRetryingId === job.id}
                className="h-11 rounded-full bg-neutral-950 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {isRetryingId === job.id ? "创建中..." : "再试一次"}
              </button>
              <button
                type="button"
                onClick={() => deleteJob(job)}
                className="col-span-2 h-11 rounded-full border border-neutral-200 text-sm font-medium text-neutral-500 transition active:scale-[0.98]"
              >
                删除记录
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
