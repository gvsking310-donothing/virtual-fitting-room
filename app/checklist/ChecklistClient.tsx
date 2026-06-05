"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

type ChecklistState = {
  hasProfile: boolean;
  hasBodyPhoto: boolean;
  hasClothes: boolean;
  hasTryOn: boolean;
  hasFavorite: boolean;
  hasOutfit: boolean;
};

const initialChecklist: ChecklistState = {
  hasProfile: false,
  hasBodyPhoto: false,
  hasClothes: false,
  hasTryOn: false,
  hasFavorite: false,
  hasOutfit: false,
};

const checklistItems = [
  {
    key: "hasProfile",
    title: "用户资料是否已完成",
    action: "去填写资料",
    href: "/profile",
  },
  {
    key: "hasBodyPhoto",
    title: "全身照是否已上传",
    action: "去上传全身照",
    href: "/body-photos",
  },
  {
    key: "hasClothes",
    title: "衣服是否已上传",
    action: "去上传衣服",
    href: "/clothes",
  },
  {
    key: "hasTryOn",
    title: "是否已有试穿记录",
    action: "去开始试穿",
    href: "/try-on",
  },
  {
    key: "hasFavorite",
    title: "是否已有收藏",
    action: "去查看试穿记录",
    href: "/try-on/history",
  },
  {
    key: "hasOutfit",
    title: "是否已有保存穿搭",
    action: "去保存穿搭",
    href: "/try-on",
  },
] as const;

export default function ChecklistClient() {
  const [checklist, setChecklist] = useState<ChecklistState>(initialChecklist);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const completedCount = useMemo(
    () => Object.values(checklist).filter(Boolean).length,
    [checklist],
  );
  const completionPercent = Math.round((completedCount / checklistItems.length) * 100);

  useEffect(() => {
    async function loadChecklist() {
      if (!isSupabaseConfigured || !supabase) {
        setMessage("请先配置 Supabase 环境变量。");
        setIsLoading(false);
        return;
      }

      try {
        const [
          userResult,
          clothesResult,
          tryOnResult,
          favoriteResult,
          outfitResult,
        ] = await Promise.all([
          supabase
            .from("users")
            .select("id, front_photo_url")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("clothes").select("*", { count: "exact", head: true }),
          supabase
            .from("try_on_jobs")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("try_on_jobs")
            .select("*", { count: "exact", head: true })
            .eq("is_favorite", true),
          supabase.from("outfit").select("*", { count: "exact", head: true }),
        ]);

        if (userResult.error) {
          console.error("Supabase checklist user error:", userResult.error);
          throw userResult.error;
        }

        if (clothesResult.error) {
          console.error("Supabase checklist clothes error:", clothesResult.error);
          throw clothesResult.error;
        }

        if (tryOnResult.error) {
          console.error("Supabase checklist try-on error:", tryOnResult.error);
          throw tryOnResult.error;
        }

        if (favoriteResult.error) {
          console.error("Supabase checklist favorite error:", favoriteResult.error);
          throw favoriteResult.error;
        }

        if (outfitResult.error) {
          console.error("Supabase checklist outfit error:", outfitResult.error);
          throw outfitResult.error;
        }

        setChecklist({
          hasProfile: Boolean(userResult.data?.id),
          hasBodyPhoto: Boolean(userResult.data?.front_photo_url),
          hasClothes: (clothesResult.count ?? 0) > 0,
          hasTryOn: (tryOnResult.count ?? 0) > 0,
          hasFavorite: (favoriteResult.count ?? 0) > 0,
          hasOutfit: (outfitResult.count ?? 0) > 0,
        });
        setMessage("");
      } catch (error) {
        console.error("Supabase checklist error:", error);
        setMessage(error instanceof Error ? error.message : "检查数据读取失败。");
      } finally {
        setIsLoading(false);
      }
    }

    loadChecklist();
  }, []);

  return (
    <div className="mt-8 space-y-5">
      {message ? (
        <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-700">
          {message}
        </p>
      ) : null}

      <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-lg shadow-neutral-200/60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-950">整体完成度</p>
            <p className="mt-1 text-xs text-neutral-500">
              {isLoading
                ? "正在检查..."
                : `${completedCount}/${checklistItems.length} 项已完成`}
            </p>
          </div>
          <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold text-white">
            {completionPercent}%
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-neutral-950 transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </section>

      <section className="space-y-3">
        {checklistItems.map((item) => {
          const isComplete = checklist[item.key];

          return (
            <article
              key={item.key}
              className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-lg shadow-neutral-200/60"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-950">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    {isComplete ? "已完成 ✅" : "未完成 ⏳"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isComplete
                      ? "bg-neutral-950 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {isComplete ? "完成" : "待办"}
                </span>
              </div>

              {!isComplete ? (
                <Link
                  href={item.href}
                  className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white transition active:scale-[0.98]"
                >
                  {item.action}
                </Link>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
