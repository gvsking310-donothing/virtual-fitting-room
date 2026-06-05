import Replicate from "replicate";

const MOCK_RESULT_IMAGE_URL = "/mock-tryon-result.svg";

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
): Promise<TryOnResult> {
  const endpoint = process.env.HUGGINGFACE_TRYON_ENDPOINT;
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (!endpoint) {
    throw new Error("HUGGINGFACE_TRYON_ENDPOINT is not configured.");
  }

  if (!token) {
    throw new Error("HUGGINGFACE_API_TOKEN is not configured.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
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
    throw new Error(`HuggingFace request failed: ${errorText}`);
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
    throw new Error("HuggingFace did not return a result image.");
  }

  return {
    result_image_url: resultImageUrl,
    provider: "huggingface",
  };
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
): Promise<TryOnResult> {
  try {
    if (provider === "huggingface") {
      return await generateHuggingFaceTryOn(userPhoto, clothingPhoto, category);
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

    return {
      ...fallbackResult,
      fallback_reason: errorMessage,
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
  const hasHuggingFaceConfig = Boolean(
    process.env.HUGGINGFACE_API_TOKEN &&
      process.env.HUGGINGFACE_TRYON_ENDPOINT,
  );
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
      description: "通过 HuggingFace 推理接口生成试穿图。",
      available: hasHuggingFaceConfig,
      status: hasHuggingFaceConfig ? "可用" : "缺少环境变量",
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
