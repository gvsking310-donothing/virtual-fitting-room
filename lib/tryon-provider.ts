import Replicate from "replicate";

const MOCK_RESULT_IMAGE_URL =
  "https://placehold.co/600x900?text=AI+Try+On+Result";

type TryOnResult = {
  result_image_url: string;
};

type ReplicateOutput =
  | string
  | URL
  | { url?: string | URL | (() => string | URL) }
  | Array<string | URL | { url?: string | URL | (() => string | URL) }>;

export async function generateMockTryOn(): Promise<TryOnResult> {
  return {
    result_image_url: MOCK_RESULT_IMAGE_URL,
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
  };
}

export async function generateTryOn(
  userPhoto: string,
  clothingPhoto: string,
  category = "上衣",
): Promise<TryOnResult> {
  void userPhoto;
  void clothingPhoto;
  void category;

  return generateMockTryOn();
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
