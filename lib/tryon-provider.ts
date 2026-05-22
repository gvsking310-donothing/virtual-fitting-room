const MOCK_RESULT_IMAGE_URL =
  "https://placehold.co/600x900?text=AI+Try+On+Result";

type TryOnResult = {
  result_image_url: string;
};

type ReplicatePrediction = {
  output?: string | string[];
  urls?: {
    get?: string;
  };
};

export async function generateMockTryOn(): Promise<TryOnResult> {
  return {
    result_image_url: MOCK_RESULT_IMAGE_URL,
  };
}

export async function generateReplicateTryOn(
  userPhoto: string,
  clothingPhoto: string,
): Promise<TryOnResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  const version = process.env.REPLICATE_MODEL_VERSION;

  if (!token || !version) {
    console.warn("Replicate is not fully configured. Falling back to mock try-on.");
    return generateMockTryOn();
  }

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      version,
      input: {
        person_image: userPhoto,
        clothing_image: clothingPhoto,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate request failed: ${errorText}`);
  }

  const prediction = (await response.json()) as ReplicatePrediction;
  const output = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;

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
): Promise<TryOnResult> {
  const provider = process.env.TRYON_PROVIDER ?? "mock";

  if (provider === "replicate" && process.env.REPLICATE_API_TOKEN) {
    return generateReplicateTryOn(userPhoto, clothingPhoto);
  }

  return generateMockTryOn();
}
