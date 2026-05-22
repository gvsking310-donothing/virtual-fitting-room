"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { getSupabaseErrorMessage } from "@/lib/supabase/errors";

type TryOnJob = {
  id: string;
  user_photo_url: string;
  clothing_image_url: string;
  status: "pending" | "processing" | "done" | "failed";
  created_at: string;
};

const statusText: Record<TryOnJob["status"], string> = {
  pending: "等待中",
  processing: "处理中",
  done: "已完成",
  failed: "失败",
};

export default function TryOnHistoryClient() {
  const [jobs, setJobs] = useState<TryOnJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadJobs() {
      if (!isSupabaseConfigured || !supabase) {
        setMessage("请先在 Vercel 配置 Supabase 环境变量。");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("try_on_jobs")
          .select("id, user_photo_url, clothing_image_url, status, created_at")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }

        setJobs(data ?? []);
      } catch (error) {
        console.error("Supabase error:", error);
        setMessage(getSupabaseErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadJobs();
  }, []);

  if (isLoading) {
    return (
      <div className="mt-8 rounded-3xl bg-neutral-100 px-5 py-8 text-sm text-neutral-600">
        正在读取试穿记录...
      </div>
    );
  }

  if (message) {
    return (
      <p className="mt-8 rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-700">
        {message}
      </p>
    );
  }

  if (jobs.length === 0) {
    return (
      <p className="mt-8 rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-600">
        暂无试穿记录。
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {jobs.map((job) => (
        <Link
          key={job.id}
          href={`/try-on/result?id=${job.id}`}
          className="block overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg shadow-neutral-200/70 transition active:scale-[0.99]"
        >
          <div className="grid grid-cols-2 gap-px bg-neutral-200">
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
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold text-neutral-950">
                AI试穿任务
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {new Date(job.created_at).toLocaleString("zh-CN")}
              </p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
              {statusText[job.status]}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
