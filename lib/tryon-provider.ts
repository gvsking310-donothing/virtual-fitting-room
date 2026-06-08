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
  debugDetails: string;

  constructor(message: string, wasQueued = false, debugDetails = "") {
    super(debugDetails ? `${message}\n\n${debugDetails}` : message);
    this.name = "HuggingFaceTryOnError";
    this.wasQueued = wasQueued;
    this.debugDetails = debugDetails;
  }
}

type HuggingFaceDebugContext = {
  apiName: string;
  rawEvents: string[];
  responseBodies: string[];
  responseStatus?: number;
  responseBody?: string;
  spaceMessages: string[];
  spaceStatus?: string;
};

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
  const debugContext: HuggingFaceDebugContext = {
    apiName,
    rawEvents: [],
    responseBodies: [],
    spaceMessages: [],
  };

  const app = await Client.connect(spaceId, {
    ...(token ? { token: token as `hf_${string}` } : {}),
    events: ["data", "status"],
    status_callback: (spaceStatus) => {
      debugContext.spaceStatus = spaceStatus.status;
      debugContext.spaceMessages.push(safeStringify(spaceStatus));

      if (isQueuedSpaceStatus(spaceStatus.status)) {
        wasQueued = true;
        queueMessage =
          getChineseSpaceStatusMessage(spaceStatus.status, spaceStatus.message);
        void onProgress?.({
          phase: "queued",
          progress: 10,
          message: queueMessage,
          wasQueued: true,
        });
      }
    },
  }).catch((error) => {
    throw new HuggingFaceTryOnError(
      getChineseErrorHint(error, false),
      false,
      buildHuggingFaceDebugDetails(error, debugContext),
    );
  });
  attachHuggingFaceFetchDebugger(app, debugContext);

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
    const nextEvent = await nextWithTimeout(
      submission,
      timeoutMs,
      debugContext,
    );

    if (nextEvent.done) {
      break;
    }

    const event = nextEvent.value;
    debugContext.rawEvents.push(safeStringify(event));

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
        const statusMessage =
          stringifyStatusMessage(event.message) ||
          "HuggingFace Space returned an error.";
        throw new HuggingFaceTryOnError(
          getChineseErrorHint(statusMessage, wasQueued),
          wasQueued,
          buildHuggingFaceDebugDetails(event, debugContext),
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
    buildHuggingFaceDebugDetails(
      {
        message: "No result image returned from HuggingFace Space.",
      },
      debugContext,
    ),
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
            getChineseErrorHint(`HuggingFace 重试后仍失败：${retryMessage}`, wasQueued),
            wasQueued,
            retryError instanceof HuggingFaceTryOnError
              ? retryError.debugDetails
              : buildHuggingFaceDebugDetails(retryError, {
                  apiName: DEFAULT_HUGGINGFACE_API_NAME,
                  rawEvents: [],
                  responseBodies: [],
                  spaceMessages: [],
                }),
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
  debugContext?: HuggingFaceDebugContext,
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
          buildHuggingFaceDebugDetails(
            { message: "HuggingFace timeout" },
            debugContext,
          ),
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

function attachHuggingFaceFetchDebugger(
  app: Client,
  debugContext: HuggingFaceDebugContext,
) {
  const originalFetch = app.fetch.bind(app);

  app.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const clonedResponse = response.clone();
    const body = await clonedResponse.text().catch(() => "");

    debugContext.responseStatus = response.status;
    debugContext.responseBody = body;

    if (!response.ok || body.includes("error")) {
      debugContext.responseBodies.push(
        safeStringify({
          url: input instanceof URL ? input.toString() : String(input),
          status: response.status,
          statusText: response.statusText,
          body,
        }),
      );
    }

    return response;
  };
}

function buildHuggingFaceDebugDetails(
  error: unknown,
  debugContext?: HuggingFaceDebugContext,
) {
  const errorRecord = normalizeErrorRecord(error);

  return [
    "HuggingFace 调试信息",
    `error.message: ${errorRecord.message || "未提供"}`,
    `error.stack: ${errorRecord.stack || "未提供"}`,
    `response status: ${debugContext?.responseStatus ?? errorRecord.status ?? "未提供"}`,
    `response body: ${debugContext?.responseBody || errorRecord.body || "未提供"}`,
    `space status: ${debugContext?.spaceStatus || "未提供"}`,
    `space messages: ${
      debugContext?.spaceMessages.length
        ? debugContext.spaceMessages.join("\n")
        : "未提供"
    }`,
    `raw events: ${
      debugContext?.rawEvents.length
        ? debugContext.rawEvents.slice(-8).join("\n")
        : "未提供"
    }`,
    `raw responses: ${
      debugContext?.responseBodies.length
        ? debugContext.responseBodies.slice(-4).join("\n")
        : "未提供"
    }`,
    `raw error object: ${safeStringify(error)}`,
  ].join("\n");
}

function normalizeErrorRecord(error: unknown) {
  const errorObject = error as {
    body?: unknown;
    cause?: unknown;
    detail?: unknown;
    message?: unknown;
    response?: { body?: unknown; data?: unknown; status?: unknown };
    stack?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };

  return {
    body: stringifyMaybe(
      errorObject?.response?.body ??
        errorObject?.response?.data ??
        errorObject?.body ??
        errorObject?.detail,
    ),
    message:
      typeof errorObject?.message === "string"
        ? errorObject.message
        : stringifyMaybe(error),
    stack: typeof errorObject?.stack === "string" ? errorObject.stack : "",
    status: errorObject?.response?.status ?? errorObject?.status ?? errorObject?.statusCode,
  };
}

function getChineseErrorHint(error: unknown, wasQueued: boolean) {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : safeStringify(error);
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("sleep")) {
    return "HuggingFace Space 正在 sleeping，已自动降级到 Mock。";
  }

  if (
    lowerMessage.includes("loading") ||
    lowerMessage.includes("starting") ||
    lowerMessage.includes("building")
  ) {
    return "HuggingFace Space 正在 loading，已自动降级到 Mock。";
  }

  if (
    lowerMessage.includes("queue full") ||
    lowerMessage.includes("queue is full") ||
    lowerMessage.includes("currently busy")
  ) {
    return "HuggingFace Space 队列已满，已自动降级到 Mock。";
  }

  if (wasQueued || lowerMessage.includes("queue") || lowerMessage.includes("排队")) {
    return `HuggingFace Space 排队或生成失败，已自动降级到 Mock。原始错误：${message}`;
  }

  if (message === "An error occurred") {
    return "HuggingFace Space 返回泛化错误 An error occurred，已自动降级到 Mock。请查看下方完整调试信息。";
  }

  return `HuggingFace 调用失败，已自动降级到 Mock。原始错误：${message}`;
}

function isQueuedSpaceStatus(status: string) {
  return (
    status === "sleeping" ||
    status === "building" ||
    status === "starting" ||
    status === "paused"
  );
}

function getChineseSpaceStatusMessage(status: string, message: string) {
  if (status === "sleeping") {
    return `HuggingFace Space 正在 sleeping，等待唤醒。${message}`;
  }

  if (status === "building" || status === "starting") {
    return `HuggingFace Space 正在 loading。${message}`;
  }

  if (status === "paused") {
    return `HuggingFace Space 已暂停。${message}`;
  }

  return message || status;
}

function stringifyMaybe(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return safeStringify(value);
}

function safeStringify(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
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
