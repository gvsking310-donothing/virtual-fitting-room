export type TrialUser = {
  id: string;
  height_cm: number;
  weight_kg: number;
  gender: string;
  age: number | null;
  avatar_url: string | null;
  front_photo_url: string | null;
  side_photo_url: string | null;
  created_at: string;
};

export type TrialClothing = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  image_url: string;
  image_path: string;
  created_at: string;
};

export type TrialOutfit = {
  id: string;
  name: string;
  top_id: string | null;
  pants_id: string | null;
  shoes_id: string | null;
  hat_id: string | null;
  bag_id: string | null;
  items: Array<{
    id: string;
    name: string;
    category: string;
    brand: string | null;
    image_url: string;
    slot: "top" | "pants" | "shoes" | "hats" | "bags";
  }>;
  created_at: string;
};

export type TrialTryOnJob = {
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

const TRIAL_USER_KEY = "virtual-fitting-trial-user";
const TRIAL_CLOTHES_KEY = "virtual-fitting-trial-clothes";
const TRIAL_OUTFITS_KEY = "virtual-fitting-trial-outfits";
const TRIAL_JOBS_KEY = "virtual-fitting-trial-jobs";

export function isTrialMode() {
  return typeof window !== "undefined";
}

export function readTrialUser() {
  return readItem<TrialUser | null>(TRIAL_USER_KEY, null);
}

export function saveTrialUser(user: TrialUser) {
  writeItem(TRIAL_USER_KEY, user);
  localStorage.setItem("virtual-fitting-user-id", user.id);
  return user;
}

export function readTrialClothes() {
  return readItem<TrialClothing[]>(TRIAL_CLOTHES_KEY, []);
}

export function saveTrialClothing(item: TrialClothing) {
  const items = [item, ...readTrialClothes()];
  writeItem(TRIAL_CLOTHES_KEY, items);
  return items;
}

export function deleteTrialClothing(itemId: string) {
  const items = readTrialClothes().filter((item) => item.id !== itemId);
  writeItem(TRIAL_CLOTHES_KEY, items);
  return items;
}

export function readTrialOutfits() {
  return readItem<TrialOutfit[]>(TRIAL_OUTFITS_KEY, []);
}

export function saveTrialOutfit(outfit: TrialOutfit) {
  const outfits = [outfit, ...readTrialOutfits()];
  writeItem(TRIAL_OUTFITS_KEY, outfits);
  return outfits;
}

export function readTrialJobs() {
  return readItem<TrialTryOnJob[]>(TRIAL_JOBS_KEY, []);
}

export function readTrialJob(jobId: string) {
  return readTrialJobs().find((job) => job.id === jobId) ?? null;
}

export function saveTrialJob(job: TrialTryOnJob) {
  const jobs = [job, ...readTrialJobs().filter((item) => item.id !== job.id)];
  writeItem(TRIAL_JOBS_KEY, jobs);
  return job;
}

export function updateTrialJob(
  jobId: string,
  updates: Partial<TrialTryOnJob>,
) {
  const jobs = readTrialJobs().map((job) =>
    job.id === jobId ? { ...job, ...updates } : job,
  );
  writeItem(TRIAL_JOBS_KEY, jobs);
  return jobs.find((job) => job.id === jobId) ?? null;
}

export function createTrialTryOnJob(params: {
  clothingId: string;
  clothingImageUrl: string;
  userId: string;
  userPhotoUrl: string;
}) {
  const now = new Date();
  const completedAt = new Date(now.getTime() + 1200);

  return saveTrialJob({
    id: crypto.randomUUID(),
    user_id: params.userId,
    clothing_id: params.clothingId,
    user_photo_url: params.userPhotoUrl,
    clothing_image_url: params.clothingImageUrl,
    status: "done",
    result_image_url: "/mock-tryon-result.svg",
    error_message: null,
    provider: "mock",
    actual_provider: "mock",
    provider_fallback_reason: null,
    provider_was_queued: false,
    generation_progress: 100,
    generation_phase: "已完成",
    generation_started_at: now.toISOString(),
    generation_completed_at: completedAt.toISOString(),
    generation_duration_seconds: 1,
    provider_retry_count: 0,
    is_favorite: false,
    created_at: now.toISOString(),
  });
}

export async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("文件读取失败。"));
    reader.readAsDataURL(file);
  });
}

function readItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeItem<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}
