"use client";

import { useEffect, useMemo, useState } from "react";

type ProviderId = "mock" | "huggingface" | "replicate" | "self-hosted";

type ProviderStatus = {
  id: ProviderId;
  name: string;
  description: string;
  available: boolean;
  status: string;
};

type ProviderResponse = {
  currentProvider: ProviderId;
  providers: ProviderStatus[];
};

export default function AiProviderClient() {
  const [currentProvider, setCurrentProvider] = useState<ProviderId>("mock");
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<ProviderId | null>(null);

  const currentProviderInfo = useMemo(
    () => providers.find((provider) => provider.id === currentProvider),
    [currentProvider, providers],
  );

  useEffect(() => {
    void loadProviderStatus();
  }, []);

  async function loadProviderStatus() {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-provider", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as ProviderResponse;
      setCurrentProvider(data.currentProvider);
      setProviders(data.providers);
    } catch (loadError) {
      console.error("AI provider status error:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "读取 AI Provider 状态失败",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function selectProvider(provider: ProviderId) {
    setError("");
    setMessage("");
    setSavingProvider(provider);

    try {
      const response = await fetch("/api/ai-provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as ProviderResponse;
      setCurrentProvider(data.currentProvider);
      setProviders(data.providers);
      setMessage(`当前试穿引擎已切换为 ${getProviderName(data.currentProvider)}`);
    } catch (saveError) {
      console.error("AI provider switch error:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "切换 AI Provider 失败",
      );
    } finally {
      setSavingProvider(null);
    }
  }

  return (
    <div className="mt-8 space-y-5">
      <section className="rounded-3xl bg-neutral-950 p-5 text-white">
        <p className="text-xs font-medium text-neutral-400">当前Provider</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">
              {currentProviderInfo?.name ?? "Mock"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-300">
              {currentProviderInfo?.description ?? "本地稳定占位图。"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-950">
            {currentProviderInfo?.available ? "可用" : "不可用"}
          </span>
        </div>
      </section>

      {message ? (
        <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm leading-6 text-neutral-700">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-950">Provider 列表</h2>
          <button
            type="button"
            onClick={() => void loadProviderStatus()}
            className="text-xs font-medium text-neutral-500"
          >
            刷新状态
          </button>
        </div>

        {isLoading ? (
          <p className="rounded-2xl bg-neutral-100 px-4 py-4 text-sm text-neutral-500">
            正在读取 Provider 状态...
          </p>
        ) : (
          <div className="space-y-3">
            {providers.map((provider, index) => {
              const isCurrent = provider.id === currentProvider;
              const isSaving = savingProvider === provider.id;

              return (
                <article
                  key={provider.id}
                  className={
                    isCurrent
                      ? "rounded-3xl border border-neutral-950 bg-white p-4"
                      : "rounded-3xl border border-neutral-200 bg-white p-4"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-neutral-500">
                        Provider {index + 1}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-neutral-950">
                        {provider.name}
                      </h3>
                    </div>
                    <span
                      className={
                        provider.available
                          ? "rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-white"
                          : "rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500"
                      }
                    >
                      {provider.available ? "可用" : "不可用"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-neutral-600">
                    {provider.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-neutral-500">状态</p>
                      <p className="mt-1 text-sm font-medium text-neutral-950">
                        {provider.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void selectProvider(provider.id)}
                      disabled={isSaving || isCurrent}
                      className={
                        isCurrent
                          ? "rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-500"
                          : "rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
                      }
                    >
                      {isCurrent ? "当前使用" : isSaving ? "切换中" : "切换"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-xs leading-5 text-neutral-500">
        提示：不可用的 Provider 也可以先切换保存；试穿时如果调用失败，系统会自动使用
        Mock 结果保证演示链路不中断。
      </p>
    </div>
  );
}

function getProviderName(provider: ProviderId) {
  const names: Record<ProviderId, string> = {
    mock: "Mock",
    huggingface: "HuggingFace",
    replicate: "Replicate",
    "self-hosted": "Self Hosted IDM-VTON",
  };

  return names[provider];
}
