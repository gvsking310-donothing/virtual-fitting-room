const MOCK_RESULT_IMAGE_URL =
  "https://placehold.co/600x900?text=AI+Try+On+Result";

type TryOnResult = {
  result_image_url: string;
};

type ReplicatePrediction = {
  id?: string;
  error?: string;
  output?: ReplicateOutput;
  status?:
    | "starting"
    | "processing"
    | "succeeded"
    | "successful"
    | "failed"
    | "canceled";
  urls?: {
    get?: string;
  };
};

type ReplicateOutput = string | string[] | { url?: string } | { url?: string }[];

export async function generateMockTryOn(): Promise<TryOnResult> {
  return {
    result_image_url: MOCK_RESULT_IMAGE_URL,
  };
}

export async function generateReplicateTryOn(
  userPhoto: string,
  clothingPhoto: string,
  garmentDescription: string,
  category: string,
): Promise<TryOnResult> {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    throw new Error("REPLICATE_API_TOKEN is not configured.");
  }

  const response = await fetch(
    "https://api.replicate.com/v1/models/cuuupid/idm-vton/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          human_img: userPhoto,
          garm_img: clothingPhoto,
          garment_des: garmentDescription,
          category: getReplicateCategory(category),
          crop: true,
          steps: 30,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate request failed: ${errorText}`);
  }

  const prediction = await waitForReplicatePrediction(
    (await response.json()) as ReplicatePrediction,
    token,
  );
  const output = getReplicateOutputUrl(prediction.output);

  if (!output) {
    throw new Error("Replicate did not return a result image.");
  }

  return {
    result_image_url: output,
  };
}

export async function generateTryOn(
  userPhoto: string,
  clothingPhoto: string,
  garmentDescription = "a clothing item",
  category = "上衣",
): Promise<TryOnResult> {
  const provider = process.env.TRYON_PROVIDER ?? "mock";

  if (provider === "replicate") {
    return generateReplicateTryOn(
      userPhoto,
      clothingPhoto,
      garmentDescription,
      category,
    );
  }

  return generateMockTryOn();
}

async function waitForReplicatePrediction(
  prediction: ReplicatePrediction,
  token: string,
): Promise<ReplicatePrediction> {
  if (prediction.status === "failed" || prediction.status === "canceled") {
    throw new Error(prediction.error || "Replicate prediction failed.");
  }

  if (
    prediction.status === "succeeded" ||
    prediction.status === "successful" ||
    prediction.output
  ) {
    return prediction;
  }

  if (!prediction.urls?.get) {
    return prediction;
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const response = await fetch(prediction.urls.get, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Replicate polling failed: ${errorText}`);
    }

    const nextPrediction = (await response.json()) as ReplicatePrediction;

    if (nextPrediction.status === "failed" || nextPrediction.status === "canceled") {
      throw new Error(nextPrediction.error || "Replicate prediction failed.");
    }

    if (
      nextPrediction.status === "succeeded" ||
      nextPrediction.status === "successful" ||
      nextPrediction.output
    ) {
      return nextPrediction;
    }
  }

  throw new Error("Replicate prediction timed out.");
}

function getReplicateOutputUrl(output: ReplicateOutput | undefined) {
  if (!output) {
    return "";
  }

  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output)) {
    const firstOutput = output[0];
    return typeof firstOutput === "string" ? firstOutput : firstOutput?.url ?? "";
  }

  return output.url ?? "";
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
