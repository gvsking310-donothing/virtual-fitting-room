"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  provider: string | null;
  actual_provider: string | null;
  provider_fallback_reason: string | null;
  provider_was_queued: boolean;
  generation_progress: number;
  generation_phase: string | null;
  generation_started_at: string | null;
  generation_completed_at: string | null;
  generation_duration_seconds: number | null;
  provider_retry_count: number;
  is_favorite: boolean;
  created_at: string;
};

const jobSelect =
  "id, user_id, clothing_id, user_photo_url, clothing_image_url, status, result_image_url, error_message, provider, actual_provider, provider_fallback_reason, provider_was_queued, generation_progress, generation_phase, generation_started_at, generation_completed_at, generation_duration_seconds, provider_retry_count, is_favorite, created_at";
const legacyJobSelect =
  "id, user_id, clothing_id, user_photo_url, clothing_image_url, status, result_image_url, error_message, is_favorite, created_at";

export default function TryOnResultClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [job, setJob] = useState<TryOnJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    label: string;
  } | null>(null);
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
          .select(jobSelect)
          .eq("id", jobId)
          .single();

        if (error) {
          if (isProviderColumnError(error)) {
            const { data: legacyData, error: legacyError } = await supabaseClient
              .from("try_on_jobs")
              .select(legacyJobSelect)
              .eq("id", jobId)
              .single();

            if (legacyError) {
              console.error("Supabase try-on job load error:", legacyError);
              throw legacyError;
            }

            setJob({
              ...legacyData,
              provider: null,
              actual_provider: null,
              provider_fallback_reason: null,
              provider_was_queued: false,
              generation_progress: legacyData.status === "done" ? 100 : 0,
              generation_phase: null,
              generation_started_at: null,
              generation_completed_at: null,
              generation_duration_seconds: null,
              provider_retry_count: 0,
            });
            setMessage("");
            return;
          }

          console.error("Supabase try-on job load error:", error);
          throw error;
        }

        setJob(data);
        setMessage("");
      } catch (error) {
        console.error("Supabase try-on job load error:", error);
        setMessage(getSupabaseErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadJob();
    const intervalId = window.setInterval(loadJob, 3000);

    return () => window.clearInterval(intervalId);
  }, [searchParams]);

  async function toggleFavorite() {
    if (!job || !supabase) {
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

      setJob({ ...job, is_favorite: nextFavorite });
      setMessage(nextFavorite ? "已收藏。" : "已取消收藏。");
    } catch (error) {
      console.error("Supabase favorite update error:", error);
      setMessage(getSupabaseErrorMessage(error));
    }
  }

  async function retryTryOn() {
    if (!job || !supabase) {
      return;
    }

    setIsRetrying(true);
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
        console.error("Supabase retry insert error:", error);
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
      setIsRetrying(false);
    }
  }

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
      {message ? (
        <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-700">
          {message}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg shadow-neutral-200/70">
        <div className="grid grid-cols-3 gap-px bg-neutral-200">
          <CompareImage
            src={job.user_photo_url}
            alt="人物照片"
            label="人物"
            onOpen={() => setPreviewImage({ src: job.user_photo_url, label: "人物照片" })}
          />
          <CompareImage
            src={job.clothing_image_url}
            alt="衣服图片"
            label="衣服"
            onOpen={() =>
              setPreviewImage({ src: job.clothing_image_url, label: "衣服图片" })
            }
          />
          {job.status === "done" && job.result_image_url ? (
            <CompareImage
              src={job.result_image_url}
              alt="试穿结果"
              label="结果"
              onOpen={() =>
                setPreviewImage({
                  src: job.result_image_url as string,
                  label: "试穿结果",
                })
              }
            />
          ) : (
            <div className="relative aspect-[3/4] bg-neutral-100">
              <div className="flex h-full items-center justify-center px-2 text-center text-xs leading-5 text-neutral-500">
                {job.status === "failed"
                  ? "生成失败"
                  : job.status === "done"
                    ? "暂无结果图"
                    : "生成中"}
              </div>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-neutral-950">
                结果
              </span>
            </div>
          )}
        </div>
      </section>

      <ProviderErrorDetails job={job} />
      <GenerationProgressCard job={job} />
      <ProviderDebugCard job={job} />

      {job.status === "processing" || job.status === "pending" ? (
        <article className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-5 py-8 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-950" />
          <p className="mt-4 text-sm font-semibold text-neutral-950">AI试穿处理中...</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            正在生成试穿结果，完成后会自动显示图片。
          </p>
        </article>
      ) : job.status === "done" && !job.result_image_url ? (
        <article className="rounded-3xl border border-neutral-200 bg-neutral-50 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-neutral-950">暂无结果图</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            任务已完成，但没有返回可显示的图片地址。
          </p>
        </article>
      ) : job.status === "failed" ? (
        <article className="rounded-3xl border border-neutral-200 bg-neutral-50 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-neutral-950">AI试穿生成失败</p>
          <p className="mt-3 whitespace-pre-wrap text-left text-xs leading-5 text-neutral-500">
            {job.error_message || "AI Provider 调用失败，请稍后重试。"}
          </p>
        </article>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={toggleFavorite}
          className="h-12 rounded-full border border-neutral-200 text-sm font-semibold text-neutral-950 transition active:scale-[0.98]"
        >
          {job.is_favorite ? "取消收藏" : "收藏"}
        </button>
        <button
          type="button"
          onClick={retryTryOn}
          disabled={isRetrying}
          className="h-12 rounded-full bg-neutral-950 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {isRetrying ? "创建中..." : "再试一次"}
        </button>
        <Link
          href="/try-on/history"
          className="flex h-12 items-center justify-center rounded-full border border-neutral-200 text-sm font-semibold text-neutral-950 transition active:scale-[0.98]"
        >
          查看历史记录
        </Link>
        {job.result_image_url ? (
          <a
            href={job.result_image_url}
            download
            className="flex h-12 items-center justify-center rounded-full border border-neutral-200 text-sm font-semibold text-neutral-950 transition active:scale-[0.98]"
          >
            高清下载
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="h-12 rounded-full border border-neutral-200 text-sm font-semibold text-neutral-400"
          >
            高清下载
          </button>
        )}
      </section>

      {previewImage ? (
        <button
          type="button"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-5"
        >
          <span className="absolute top-6 text-sm font-medium text-white">
            {previewImage.label}
          </span>
          <img
            src={previewImage.src}
            alt={previewImage.label}
            className="max-h-[82vh] max-w-full rounded-3xl object-contain"
          />
          <span className="absolute bottom-6 rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-950">
            点击关闭
          </span>
        </button>
      ) : null}
    </div>
  );
}

function ProviderErrorDetails({ job }: { job: TryOnJob }) {
  const fallbackReason = job.provider_fallback_reason || "";
  const errorMessage = job.error_message || "";
  const hasErrorDetails = Boolean(fallbackReason || errorMessage);
  const isHuggingFaceFallback =
    job.provider === "huggingface" && job.actual_provider === "mock";

  if (!hasErrorDetails) {
    return null;
  }

  return (
    <section
      className={
        isHuggingFaceFallback
          ? "rounded-3xl border border-red-200 bg-red-50 p-5 text-red-950 shadow-lg shadow-red-100/70"
          : "rounded-3xl border border-neutral-200 bg-white p-5 shadow-lg shadow-neutral-200/60"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium opacity-70">Provider Error</p>
          <h2 className="mt-1 text-lg font-semibold">
            {isHuggingFaceFallback
              ? "HuggingFace失败，已降级Mock"
              : "Provider错误详情"}
          </h2>
        </div>
        <span
          className={
            isHuggingFaceFallback
              ? "rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white"
              : "rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-white"
          }
        >
          始终显示
        </span>
      </div>

      {fallbackReason ? (
        <div className="mt-4">
          <p className="text-sm font-semibold">provider_fallback_reason</p>
          <pre
            className={
              isHuggingFaceFallback
                ? "mt-2 max-h-none overflow-visible rounded-2xl bg-white p-3 whitespace-pre-wrap text-left text-xs leading-5 text-red-950"
                : "mt-2 max-h-none overflow-visible rounded-2xl bg-neutral-100 p-3 whitespace-pre-wrap text-left text-xs leading-5 text-neutral-950"
            }
          >
            {fallbackReason}
          </pre>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4">
          <p className="text-sm font-semibold">error_message</p>
          <pre
            className={
              isHuggingFaceFallback
                ? "mt-2 max-h-none overflow-visible rounded-2xl bg-white p-3 whitespace-pre-wrap text-left text-xs leading-5 text-red-950"
                : "mt-2 max-h-none overflow-visible rounded-2xl bg-neutral-100 p-3 whitespace-pre-wrap text-left text-xs leading-5 text-neutral-950"
            }
          >
            {errorMessage}
          </pre>
        </div>
      ) : null}
    </section>
  );
}

function GenerationProgressCard({ job }: { job: TryOnJob }) {
  const progress = getGenerationProgress(job);
  const phase = getGenerationPhase(job);
  const duration = getGenerationDuration(job);

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-lg shadow-neutral-200/60">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-neutral-500">AI生成进度</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-950">
            正在生成试穿图
          </h2>
        </div>
        <span className="text-2xl font-semibold text-neutral-950">
          {progress}%
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-neutral-950 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-medium">
        {["当前排队中", "当前生成中", "已完成"].map((label) => (
          <span
            key={label}
            className={
              phase === label
                ? "rounded-full bg-neutral-950 px-2 py-2 text-white"
                : "rounded-full bg-neutral-100 px-2 py-2 text-neutral-500"
            }
          >
            {label}
          </span>
        ))}
      </div>

      <p className="mt-4 text-sm leading-6 text-neutral-600">
        状态：
        <span className="font-medium text-neutral-950">{phase}</span>
      </p>
      <p className="mt-1 text-sm leading-6 text-neutral-600">
        本次生成耗时：
        <span className="font-medium text-neutral-950">
          {duration !== null ? `${duration} 秒` : "计算中"}
        </span>
      </p>
    </section>
  );
}

function ProviderDebugCard({ job }: { job: TryOnJob }) {
  const requestedProvider = normalizeProviderLabel(job.provider);
  const actualProvider = normalizeProviderLabel(job.actual_provider);
  const fallbackReason = job.provider_fallback_reason || job.error_message || "";
  const hasFallback =
    Boolean(job.provider_fallback_reason) ||
    Boolean(job.provider && job.actual_provider === "mock" && job.provider !== "mock");
  const wasQueued =
    job.provider_was_queued || fallbackReason.includes("排队");
  const providerStatus =
    job.status === "processing" || job.status === "pending"
      ? "处理中"
      : job.status === "failed" || hasFallback
        ? "失败"
        : "成功";

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-lg shadow-neutral-200/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-neutral-500">当前 Provider</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-950">
            {requestedProvider}
          </h2>
        </div>
        <span
          className={
            providerStatus === "成功"
              ? "rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-white"
              : "rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600"
          }
        >
          {providerStatus}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm leading-6 text-neutral-700">
        <p>
          状态：
          <span className="font-medium text-neutral-950">{providerStatus}</span>
        </p>
        <p>
          是否排队：
          <span className="font-medium text-neutral-950">
            {wasQueued ? "是" : "否"}
          </span>
        </p>
        <p>
          是否降级：
          <span className="font-medium text-neutral-950">
            {hasFallback ? "是" : "否"}
          </span>
        </p>
        <p>
          自动重试：
          <span className="font-medium text-neutral-950">
            {job.provider_retry_count} 次
          </span>
        </p>
        {fallbackReason ? (
          <div>
            <p>错误：</p>
            <pre className="mt-2 max-h-80 overflow-auto rounded-2xl bg-neutral-100 p-3 whitespace-pre-wrap text-left text-xs leading-5 font-medium text-neutral-950">
              {fallbackReason}
            </pre>
          </div>
        ) : null}
        {hasFallback ? (
          <p className="font-medium text-neutral-950">
            已自动切换到 {actualProvider}
          </p>
        ) : null}
        {job.error_message ? (
          <p className="rounded-2xl bg-neutral-100 px-4 py-3 whitespace-pre-wrap text-left text-xs leading-5 text-neutral-600">
            error_message：{job.error_message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function normalizeProviderLabel(provider?: string | null) {
  const providerLabels: Record<string, string> = {
    mock: "Mock",
    replicate: "Replicate",
    huggingface: "HuggingFace",
    "self-hosted": "Self Hosted",
  };

  return providerLabels[provider ?? ""] ?? "Mock";
}

function isProviderColumnError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";

  return (
    error.code === "PGRST204" &&
    (message.includes("provider") ||
      message.includes("actual_provider") ||
      message.includes("provider_fallback_reason") ||
      message.includes("provider_was_queued") ||
      message.includes("generation_progress") ||
      message.includes("generation_phase") ||
      message.includes("generation_started_at") ||
      message.includes("generation_completed_at") ||
      message.includes("generation_duration_seconds") ||
      message.includes("provider_retry_count"))
  );
}

function CompareImage({
  src,
  alt,
  label,
  onOpen,
}: {
  src: string;
  alt: string;
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative aspect-[3/4] bg-neutral-100 text-left"
    >
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-neutral-950">
        {label}
      </span>
    </button>
  );
}

function getGenerationProgress(job: TryOnJob) {
  if (job.status === "done") {
    return 100;
  }

  if (job.status === "failed") {
    return Math.max(job.generation_progress || 0, 100);
  }

  return Math.min(Math.max(job.generation_progress || 0, 0), 99);
}

function getGenerationPhase(job: TryOnJob) {
  if (job.status === "done") {
    return "已完成";
  }

  if (job.provider_was_queued || job.generation_phase === "当前排队中") {
    return "当前排队中";
  }

  if (job.status === "processing" || job.status === "pending") {
    return "当前生成中";
  }

  return job.generation_phase || "当前生成中";
}

function getGenerationDuration(job: TryOnJob) {
  if (typeof job.generation_duration_seconds === "number") {
    return job.generation_duration_seconds;
  }

  const startTime = job.generation_started_at || job.created_at;

  if (job.status === "processing" || job.status === "pending") {
    return Math.max(0, Math.round((Date.now() - new Date(startTime).getTime()) / 1000));
  }

  return null;
}
