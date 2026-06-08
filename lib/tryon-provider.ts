import { Client, handle_file } from "@gradio/client";
import Replicate from "replicate";

const MOCK_RESULT_IMAGE_URL = "/mock-tryon-result.svg";
const DEFAULT_HUGGINGFACE_SPACE_ID = "yisol/IDM-VTON";
const DEFAULT_HUGGINGFACE_API_NAME = "/tryon";
const DEFAULT_HUGGINGFACE_TIMEOUT_MS = 60_000;

export const AI_PROVIDER_COOKIE = "tryon_provider";

export type TryOnProvider =
  | "mock"
  | "huggingface"
  | "replicate"
  | "self-hosted";

export type TryOnResult = {
  result_image_url: string;
  provider: TryOnProvider;
  fallback_reason?: string;
  was_queued?: boolean;
  retry_count?: number;
};

export type TryOnProgress = {
  phase: "queued" | "generating" | "done";
  progress: number;
  message?: string;
  wasQueued?: boolean;
};

export type TryOnProviderStatus = {
  id: TryOnProvider;
  name: string;
  description: string;
  available: boolean;
  status: string;
};

type ReplicateOutput =
  | string
  | URL
  | { url?: string | URL | (() => string | URL) }
  | Array<string | URL | { url?: string | URL | (() => string | URL) }>;

class HuggingFaceTryOnError extends Error {
  wasQueued: boolean;

  constructor(message: string, wasQueued = false) {
    super(message);
    this.name = "HuggingFaceTryOnError";
    this.wasQueued = wasQueued;
  }
}

export async function generateMockTryOn(): Promise<TryOnResult> {
  return {
    result_image_url: MOCK_RESULT_IMAGE_URL,
    provider: "mock",
  };
}

export async function generateHuggingFaceTryOn(
  userPhoto: string,
  clothingPhoto: string,
  category = "上衣",
  onProgress?: (progress: TryOnProgress) => Promise<void> | void,
): Promise<TryOnResult> {
  const spaceId =
    process.env.HUGGINGFACE_SPACE_ID ?? DEFAULT_HUGGINGFACE_SPACE_ID;
  const apiName =
    process.env.HUGGINGFACE_SPACE_API_NAME ?? DEFAULT_HUGGINGFACE_API_NAME;
  const token = process.env.HUGGINGFACE_API_TOKEN;
  const timeoutMs = getHuggingFaceTimeoutMs();
  let wasQueued = false;
  let queueMessage = "";

  const app = await Client.connect(spaceId, {
    ...(token ? { token: token as `hf_${string}` } : {}),
    events: ["data", "status"],
    status_callback: (spaceStatus) => {
      if (
        spaceStatus.status === "sleeping" ||
        spaceStatus.status === "building" ||
        spaceStatus.status === "starting"
      ) {
        wasQueued = true;
        queueMessage = spaceStatus.message || spaceStatus.status;
        void onProgress?.({
          phase: "queued",
          progress: 10,
          message: queueMessage,
          wasQueued: true,
        });
      }
    },
  });
  await onProgress?.({
    phase: "generating",
    progress: wasQueued ? 25 : 20,
    message: "正在生成试穿图",
    wasQueued,
  });
  const submission = app.submit(apiName, {
    dict: {
      background: handle_file(userPhoto),
      layers: [],
      composite: null,
    },
    garm_img: handle_file(clothingPhoto),
    garment_des: createGarmentDescription(category),
    is_checked: true,
    is_checked_crop: false,
    denoise_steps: 30,
    seed: 42,
  });

  while (true) {
    const nextEvent = await nextWithTimeout(submission, timeoutMs);

    if (nextEvent.done) {
      break;
    }

    const event = nextEvent.value;

    if (event.type === "status") {
      if (event.queue) {
        wasQueued = true;
        queueMessage = formatQueueMessage(event.position, event.eta);
        await onProgress?.({
          phase: "queued",
          progress: 30,
          message: queueMessage,
          wasQueued: true,
        });
      }

      if (event.stage === "error") {
        throw new HuggingFaceTryOnError(
          stringifyStatusMessage(event.message) ||
            "HuggingFace Space returned an error.",
          wasQueued,
        );
      }

      if (event.stage === "generating") {
        await onProgress?.({
          phase: "generating",
          progress: 70,
          message: "正在生成试穿图",
          wasQueued,
        });
      }
    }

    if (event.type === "data") {
      const resultImageUrl = getHuggingFaceOutputUrl(event.data);

      if (resultImageUrl) {
        return {
          result_image_url: resultImageUrl,
          provider: "huggingface",
          was_queued: wasQueued,
        };
      }
    }
  }

  throw new HuggingFaceTryOnError(
    queueMessage
      ? `HuggingFace Space did not return a result image. ${queueMessage}`
      : "HuggingFace Space did not return a result image.",
    wasQueued,
  );
}

export async function generateReplicateTryOn(
  userPhoto: string,
  clothingPhoto: string,
  category = "上衣",
): Promise<TryOnResult> {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    throw new Error("REPLICATE_API_TOKEN is not configured.");
  }

  const replicate = new Replicate({ auth: token });
  const output = (await replicate.run("cuuupid/idm-vton", {
    input: {
      human_img: userPhoto,
      garm_img: clothingPhoto,
      garment_des: createGarmentDescription(category),
      category: getReplicateCategory(category),
      crop: true,
      steps: 30,
    },
  })) as ReplicateOutput;
  const resultImageUrl = getReplicateOutputUrl(output);

  if (!resultImageUrl) {
    throw new Error("Replicate did not return a result image.");
  }

  return {
    result_image_url: resultImageUrl,
    provider: "replicate",
  };
}

export async function generateSelfHostedTryOn(
  userPhoto: string,
  clothingPhoto: string,
  category = "上衣",
): Promise<TryOnResult> {
  const endpoint = process.env.SELF_HOSTED_IDM_VTON_URL;

  if (!endpoint) {
    throw new Error("SELF_HOSTED_IDM_VTON_URL is not configured.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      human_img: userPhoto,
      garm_img: clothingPhoto,
      garment_des: createGarmentDescription(category),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Self Hosted IDM-VTON request failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    result_image_url?: string;
    image_url?: string;
    output?: string | string[];
  };
  const resultImageUrl =
    data.result_image_url ??
    data.image_url ??
    (Array.isArray(data.output) ? data.output[0] : data.output);

  if (!resultImageUrl) {
    throw new Error("Self Hosted IDM-VTON did not return a result image.");
  }

  return {
    result_image_url: resultImageUrl,
    provider: "self-hosted",
  };
}

export async function generateTryOn(
  userPhoto: string,
  clothingPhoto: string,
  category = "上衣",
  provider: TryOnProvider = getDefaultProvider(),
  onProgress?: (progress: TryOnProgress) => Promise<void> | void,
): Promise<TryOnResult> {
  try {
    if (provider === "huggingface") {
      try {
        return await generateHuggingFaceTryOn(
          userPhoto,
          clothingPhoto,
          category,
          onProgress,
        );
      } catch (firstError) {
        console.error("HuggingFace try-on failed, retrying once:", firstError);
        await onProgress?.({
          phase: "generating",
          progress: 45,
          message: "HuggingFace 失败，正在自动重试",
          wasQueued:
            firstError instanceof HuggingFaceTryOnError
              ? firstError.wasQueued
              : false,
        });

        try {
          const retryResult = await generateHuggingFaceTryOn(
            userPhoto,
            clothingPhoto,
            category,
            onProgress,
          );

          return {
            ...retryResult,
            retry_count: 1,
          };
        } catch (retryError) {
          const wasQueued =
            retryError instanceof HuggingFaceTryOnError
              ? retryError.wasQueued
              : firstError instanceof HuggingFaceTryOnError
                ? firstError.wasQueued
                : false;
          const retryMessage =
            retryError instanceof Error
              ? retryError.message
              : "HuggingFace retry failed.";

          throw new HuggingFaceTryOnError(
            `HuggingFace 重试后仍失败：${retryMessage}`,
            wasQueued,
          );
        }
      }
    }

    if (provider === "replicate") {
      return await generateReplicateTryOn(userPhoto, clothingPhoto, category);
    }

    if (provider === "self-hosted") {
      return await generateSelfHostedTryOn(userPhoto, clothingPhoto, category);
    }

    return generateMockTryOn();
  } catch (error) {
    console.error("Try-on provider failed, falling back to mock:", error);
    const fallbackResult = await generateMockTryOn();
    const errorMessage =
      error instanceof Error ? error.message : "AI provider failed.";
    const wasQueued =
      error instanceof HuggingFaceTryOnError ? error.wasQueued : false;

    return {
      ...fallbackResult,
      fallback_reason: errorMessage,
      was_queued: wasQueued,
      retry_count: provider === "huggingface" ? 1 : 0,
    };
  }
}

export function normalizeProvider(provider?: string | null): TryOnProvider {
  if (
    provider === "mock" ||
    provider === "huggingface" ||
    provider === "replicate" ||
    provider === "self-hosted"
  ) {
    return provider;
  }

  return "mock";
}

export function getDefaultProvider() {
  return normalizeProvider(process.env.TRYON_PROVIDER);
}

export function getProviderStatuses(): TryOnProviderStatus[] {
  const hasReplicateToken = Boolean(process.env.REPLICATE_API_TOKEN);
  const hasSelfHostedEndpoint = Boolean(process.env.SELF_HOSTED_IDM_VTON_URL);

  return [
    {
      id: "mock",
      name: "Mock",
      description: "本地稳定占位图，永远可用，适合演示兜底。",
      available: true,
      status: "可用",
    },
    {
      id: "huggingface",
      name: "HuggingFace",
      description: "通过免费 HuggingFace Space 调用 IDM-VTON Demo。",
      available: true,
      status: "免费 Space 可用，可能排队",
    },
    {
      id: "replicate",
      name: "Replicate",
      description: "调用 cuuupid/idm-vton 真实虚拟试穿模型。",
      available: hasReplicateToken,
      status: hasReplicateToken ? "可用" : "缺少 REPLICATE_API_TOKEN",
    },
    {
      id: "self-hosted",
      name: "Self Hosted IDM-VTON",
      description: "连接自托管 IDM-VTON 服务，适合后续私有化部署。",
      available: hasSelfHostedEndpoint,
      status: hasSelfHostedEndpoint
        ? "可用"
        : "缺少 SELF_HOSTED_IDM_VTON_URL",
    },
  ];
}

async function nextWithTimeout<T>(
  submission: AsyncIterator<T> & { cancel?: () => Promise<void> },
  timeoutMs: number,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      if (submission.cancel) {
        void submission.cancel().catch(() => undefined);
      }

      reject(
        new HuggingFaceTryOnError(
          "HuggingFace Space 排队或生成超时，已自动降级到 Mock。",
          true,
        ),
      );
    }, timeoutMs);
  });

  try {
    return (await Promise.race([
      submission.next(),
      timeoutPromise,
    ])) as IteratorResult<T>;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function getHuggingFaceOutputUrl(output: unknown): string {
  if (!output) {
    return "";
  }

  if (typeof output === "string") {
    return output;
  }

  if (output instanceof URL) {
    return output.toString();
  }

  if (Array.isArray(output)) {
    for (const item of output) {
      const result = getHuggingFaceOutputUrl(item);

      if (result) {
        return result;
      }
    }

    return "";
  }

  if (typeof output === "object") {
    const outputRecord = output as Record<string, unknown>;
    const possibleValue =
      outputRecord.url ??
      outputRecord.path ??
      outputRecord.name ??
      outputRecord.result_image_url ??
      outputRecord.image_url ??
      outputRecord.output ??
      outputRecord.data;

    return getHuggingFaceOutputUrl(possibleValue);
  }

  return "";
}

function getHuggingFaceTimeoutMs() {
  const timeout = Number(process.env.HUGGINGFACE_TIMEOUT_MS);

  return Number.isFinite(timeout) && timeout > 0
    ? timeout
    : DEFAULT_HUGGINGFACE_TIMEOUT_MS;
}

function formatQueueMessage(position?: number, eta?: number) {
  const positionText =
    typeof position === "number" ? `队列位置 ${position}` : "已进入队列";
  const etaText = typeof eta === "number" ? `，预计 ${Math.ceil(eta)} 秒` : "";

  return `${positionText}${etaText}`;
}

function stringifyStatusMessage(message: unknown) {
  if (!message) {
    return "";
  }

  if (typeof message === "string") {
    return message;
  }

  return JSON.stringify(message);
}

function getReplicateOutputUrl(output: ReplicateOutput | undefined) {
  if (!output) {
    return "";
  }

  if (typeof output === "string") {
    return output;
  }

  if (output instanceof URL) {
    return output.toString();
  }

  if (Array.isArray(output)) {
    const firstOutput = output[0];
    return getReplicateOutputUrl(firstOutput);
  }

  if (typeof output.url === "function") {
    return output.url().toString();
  }

  return output.url?.toString() ?? "";
}

export function createGarmentDescription(category: string) {
  const descriptions: Record<string, string> = {
    上衣: "a black shirt",
    裤子: "a pair of pants",
    裙子: "a skirt",
    外套: "a jacket",
    鞋子: "a pair of shoes",
    帽子: "a hat",
    包包: "a bag",
    首饰: "an accessory",
  };

  return descriptions[category] ?? "a clothing item";
}

function getReplicateCategory(category: string) {
  const categoryMap: Record<string, "upper_body" | "lower_body" | "dresses"> = {
    上衣: "upper_body",
    外套: "upper_body",
    裤子: "lower_body",
    裙子: "dresses",
  };

  return categoryMap[category] ?? "upper_body";
}
