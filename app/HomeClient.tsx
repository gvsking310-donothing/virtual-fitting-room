"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

type RecentTryOnJob = {
  id: string;
  user_photo_url: string;
  clothing_image_url: string;
  status: "pending" | "processing" | "done" | "failed";
  result_image_url: string | null;
  created_at: string;
};

type DashboardStats = {
  clothesCount: number;
  tryOnCount: number;
  favoriteCount: number;
};

const initialStats: DashboardStats = {
  clothesCount: 0,
  tryOnCount: 0,
  favoriteCount: 0,
};

export default function HomeClient() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [recentJobs, setRecentJobs] = useState<RecentTryOnJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      if (!isSupabaseConfigured || !supabase) {
        setMessage("请先配置 Supabase 环境变量。");
        setIsLoading(false);
        return;
      }

      try {
        const [
          clothesResult,
          tryOnResult,
          favoriteResult,
          recentResult,
        ] = await Promise.all([
          supabase.from("clothes").select("*", { count: "exact", head: true }),
          supabase
            .from("try_on_jobs")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("try_on_jobs")
            .select("*", { count: "exact", head: true })
            .eq("is_favorite", true),
          supabase
            .from("try_on_jobs")
            .select(
              "id, user_photo_url, clothing_image_url, status, result_image_url, created_at",
            )
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

        if (clothesResult.error) {
          console.error("Supabase clothes count error:", clothesResult.error);
          throw clothesResult.error;
        }

        if (tryOnResult.error) {
          console.error("Supabase try-on count error:", tryOnResult.error);
          throw tryOnResult.error;
        }

        if (favoriteResult.error) {
          console.error("Supabase favorite count error:", favoriteResult.error);
          throw favoriteResult.error;
        }

        if (recentResult.error) {
          console.error("Supabase recent try-on error:", recentResult.error);
          throw recentResult.error;
        }

        setStats({
          clothesCount: clothesResult.count ?? 0,
          tryOnCount: tryOnResult.count ?? 0,
          favoriteCount: favoriteResult.count ?? 0,
        });
        setRecentJobs((recentResult.data ?? []) as RecentTryOnJob[]);
        setMessage("");
      } catch (error) {
        console.error("Supabase dashboard error:", error);
        setMessage(error instanceof Error ? error.message : "首页数据读取失败。");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto w-full max-w-md space-y-8 rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span className="font-medium">Virtual Fitting</span>
          <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs text-white">
            AI
          </span>
        </div>

        <div className="space-y-7">
          <div className="space-y-4">
            <p className="text-sm font-medium text-neutral-500">智能穿搭预览</p>
            <h1 className="text-5xl font-semibold leading-tight tracking-normal text-neutral-950">
              AI虚拟试衣间
            </h1>
            <p className="max-w-xs text-base leading-7 text-neutral-600">
              上传资料，快速生成更贴合你的试衣体验。
            </p>
          </div>

          <Link
            href="/profile"
            className="flex h-14 w-full items-center justify-center rounded-full bg-neutral-950 text-base font-semibold text-white shadow-lg shadow-neutral-300 transition active:scale-[0.98]"
          >
            开始体验
          </Link>
        </div>

        {message ? (
          <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-700">
            {message}
          </p>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-950">我的数据</h2>
            <span className="text-xs text-neutral-500">
              {isLoading ? "读取中" : "实时概览"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <StatCard label="衣服" value={stats.clothesCount} />
            <StatCard label="试穿" value={stats.tryOnCount} />
            <StatCard label="收藏" value={stats.favoriteCount} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-950">快捷入口</h2>
          <div className="grid grid-cols-2 gap-3 text-center text-sm font-medium">
            <Link
              href="/try-on"
              className="rounded-2xl bg-neutral-950 px-3 py-4 text-white transition active:scale-[0.98]"
            >
              AI试穿
            </Link>
            <Link
              href="/clothes"
              className="rounded-2xl bg-neutral-100 px-3 py-4 text-neutral-950 transition active:scale-[0.98]"
            >
              上传服装
            </Link>
            <Link
              href="/try-on"
              className="rounded-2xl bg-neutral-100 px-3 py-4 text-neutral-950 transition active:scale-[0.98]"
            >
              我的穿搭
            </Link>
            <Link
              href="/favorites"
              className="rounded-2xl bg-neutral-100 px-3 py-4 text-neutral-950 transition active:scale-[0.98]"
            >
              我的收藏
            </Link>
            <Link
              href="/try-on/history"
              className="col-span-2 rounded-2xl bg-neutral-100 px-3 py-4 text-neutral-950 transition active:scale-[0.98]"
            >
              我的试穿记录
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-950">最近试穿</h2>
            <Link href="/try-on/history" className="text-xs font-medium text-neutral-500">
              查看全部
            </Link>
          </div>

          {recentJobs.length > 0 ? (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/try-on/result?id=${job.id}`}
                  className="block overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg shadow-neutral-200/60 transition active:scale-[0.99]"
                >
                  <div className="grid grid-cols-3 gap-px bg-neutral-200">
                    <PreviewImage src={job.user_photo_url} alt="人物照片" />
                    <PreviewImage src={job.clothing_image_url} alt="衣服图片" />
                    {job.result_image_url ? (
                      <PreviewImage src={job.result_image_url} alt="试穿结果" />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center bg-neutral-100 px-2 text-center text-xs leading-5 text-neutral-500">
                        {job.status === "failed" ? "生成失败" : "生成中"}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-neutral-500">
                      {new Date(job.created_at).toLocaleString("zh-CN")}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                      {job.status === "done" ? "已完成" : job.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-600">
              暂无最近试穿。
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-neutral-100 px-2 py-4">
      <p className="text-2xl font-semibold text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function PreviewImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="aspect-[3/4] bg-neutral-100">
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}
