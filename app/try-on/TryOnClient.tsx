"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { getSupabaseErrorMessage } from "@/lib/supabase/errors";

type UserProfile = {
  id: string;
  height_cm: number;
  weight_kg: number;
  gender: string;
  age: number | null;
  avatar_url: string | null;
  front_photo_url: string | null;
};

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  image_url: string;
  created_at: string;
};

type OutfitSlot = "top" | "pants" | "shoes" | "hats" | "bags";

type OutfitSelection = Record<OutfitSlot, string>;

type OutfitSnapshot = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  image_url: string;
  slot: OutfitSlot;
};

type SavedOutfit = {
  id: string;
  name: string;
  top_id: string | null;
  pants_id: string | null;
  shoes_id: string | null;
  hat_id: string | null;
  bag_id: string | null;
  items: OutfitSnapshot[];
  created_at: string;
};

const emptyOutfitSelection: OutfitSelection = {
  top: "",
  pants: "",
  shoes: "",
  hats: "",
  bags: "",
};

const outfitSlots: Array<{ key: OutfitSlot; label: string; categories: string[] }> = [
  { key: "top", label: "上衣", categories: ["上衣", "外套"] },
  { key: "pants", label: "裤子", categories: ["裤子"] },
  { key: "shoes", label: "鞋子", categories: ["鞋子"] },
  { key: "hats", label: "帽子", categories: ["帽子"] },
  { key: "bags", label: "包包", categories: ["包包"] },
];

function getOutfitSlot(category: string): OutfitSlot | null {
  return outfitSlots.find((slot) => slot.categories.includes(category))?.key ?? null;
}

function createOutfitSnapshot(item: ClothingItem): OutfitSnapshot | null {
  const slot = getOutfitSlot(item.category);

  if (!slot) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    brand: item.brand,
    image_url: item.image_url,
    slot,
  };
}

function getOutfitItemsFromIds(outfit: SavedOutfit, clothes: ClothingItem[]) {
  const idsBySlot: OutfitSelection = {
    top: outfit.top_id ?? "",
    pants: outfit.pants_id ?? "",
    shoes: outfit.shoes_id ?? "",
    hats: outfit.hat_id ?? "",
    bags: outfit.bag_id ?? "",
  };

  return outfitSlots
    .map((slot) => {
      const item = clothes.find((clothing) => clothing.id === idsBySlot[slot.key]);
      return item ? createOutfitSnapshot(item) : null;
    })
    .filter((item): item is OutfitSnapshot => Boolean(item));
}

export default function TryOnClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [selectedClothingId, setSelectedClothingId] = useState("");
  const [outfitSelection, setOutfitSelection] =
    useState<OutfitSelection>(emptyOutfitSelection);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isSavingOutfit, setIsSavingOutfit] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");

  const selectedClothing = useMemo(
    () => clothes.find((item) => item.id === selectedClothingId) ?? null,
    [clothes, selectedClothingId],
  );

  const selectedOutfitItems = useMemo(
    () =>
      outfitSlots
        .map((slot) => {
          const item = clothes.find(
            (clothing) => clothing.id === outfitSelection[slot.key],
          );
          return item ? createOutfitSnapshot(item) : null;
        })
        .filter((item): item is OutfitSnapshot => Boolean(item)),
    [clothes, outfitSelection],
  );

  const hasSelectedOutfit = selectedOutfitItems.length > 0;

  async function loadOutfits(userId: string, clothingItems = clothes) {
    if (!supabase) {
      throw new Error("Supabase 未配置。");
    }

    const { data, error } = await supabase
      .from("outfit")
      .select(
        "id, name, top_id, pants_id, shoes_id, hat_id, bag_id, items, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase outfit load error:", error);
      throw error;
    }

    const normalizedOutfits = ((data ?? []) as SavedOutfit[]).map((outfit) => ({
      ...outfit,
      items:
        outfit.items?.length > 0
          ? outfit.items
          : getOutfitItemsFromIds(outfit, clothingItems),
    }));

    setOutfits(normalizedOutfits);
    return normalizedOutfits;
  }

  useEffect(() => {
    async function loadTryOnData() {
      setMessage("");

      if (!isSupabaseConfigured || !supabase) {
        setMessage("请先在 Vercel 配置 Supabase 环境变量。");
        setIsLoading(false);
        return;
      }

      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select(
            "id, height_cm, weight_kg, gender, age, avatar_url, front_photo_url",
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (userError) {
          console.error("Supabase error:", userError);
          throw userError;
        }

        const { data: clothesData, error: clothesError } = await supabase
          .from("clothes")
          .select("id, name, category, brand, image_url, created_at")
          .order("created_at", { ascending: false });

        if (clothesError) {
          console.error("Supabase error:", clothesError);
          throw clothesError;
        }

        setProfile(userData);
        setClothes(clothesData ?? []);
        await loadOutfits(userData.id, clothesData ?? []);
      } catch (error) {
        console.error("Supabase load try-on data error:", error);
        setMessage(getSupabaseErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadTryOnData();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(""), 2200);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  function selectClothing(item: ClothingItem) {
    const slot = getOutfitSlot(item.category);
    setSelectedClothingId((currentId) => (currentId === item.id ? "" : item.id));

    if (!slot) {
      return;
    }

    setOutfitSelection((current) => ({
      ...current,
      [slot]: current[slot] === item.id ? "" : item.id,
    }));
  }

  function applySavedOutfit(outfit: SavedOutfit) {
    try {
      const nextSelection: OutfitSelection = {
        top: outfit.top_id ?? "",
        pants: outfit.pants_id ?? "",
        shoes: outfit.shoes_id ?? "",
        hats: outfit.hat_id ?? "",
        bags: outfit.bag_id ?? "",
      };

      if (!Object.values(nextSelection).some(Boolean)) {
        outfit.items.forEach((item) => {
          nextSelection[item.slot] = item.id;
        });
      }

      setOutfitSelection(nextSelection);
      setSelectedClothingId(Object.values(nextSelection).find(Boolean) ?? "");
      setMessage("");
      setToast("已套用穿搭");
    } catch (error) {
      console.error("Apply outfit error:", error);
      setMessage(error instanceof Error ? error.message : "套用穿搭失败。");
    }
  }

  async function saveOutfit() {
    if (!profile) {
      setMessage("请先完成用户资料。");
      return;
    }

    if (!hasSelectedOutfit) {
      setMessage("请先选择至少一件单品。");
      return;
    }

    if (!supabase) {
      setMessage("Supabase 未配置。");
      return;
    }

    setIsSavingOutfit(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("outfit")
        .insert({
          user_id: profile.id,
          name: `我的穿搭 ${outfits.length + 1}`,
          top_id: outfitSelection.top || null,
          pants_id: outfitSelection.pants || null,
          shoes_id: outfitSelection.shoes || null,
          hat_id: outfitSelection.hats || null,
          bag_id: outfitSelection.bags || null,
          items: selectedOutfitItems,
        })

      if (error) {
        console.error("Supabase outfit save error:", error);
        throw error;
      }

      await loadOutfits(profile.id);
      setMessage("");
      setToast("穿搭保存成功");
    } catch (error) {
      console.error("Supabase outfit save error:", error);
      setMessage(getSupabaseErrorMessage(error));
    } finally {
      setIsSavingOutfit(false);
    }
  }

  async function startTryOn() {
    if (!selectedClothing || !profile) {
      return;
    }

    if (!profile.front_photo_url) {
      setMessage("请先上传正面全身照片。");
      return;
    }

    if (!supabase) {
      setMessage("Supabase 未配置。");
      return;
    }

    setIsCreatingJob(true);
    setMessage("");
    let createdJobId = "";

    try {
      const { data, error } = await supabase
        .from("try_on_jobs")
        .insert({
          user_id: profile.id,
          clothing_id: selectedClothing.id,
          user_photo_url: profile.front_photo_url,
          clothing_image_url: selectedClothing.image_url,
          status: "processing",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      createdJobId = data.id;

      const response = await fetch("/api/try-on", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_id: createdJobId,
          user_photo_url: profile.front_photo_url,
          clothing_image_url: selectedClothing.image_url,
          clothing_category: selectedClothing.category,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "AI试穿任务生成失败。");
      }

      router.push(`/try-on/result?id=${createdJobId}`);
    } catch (error) {
      console.error("Supabase error:", error);
      setMessage(getSupabaseErrorMessage(error));
      if (createdJobId) {
        router.push(`/try-on/result?id=${createdJobId}`);
      }
    } finally {
      setIsCreatingJob(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mt-8 rounded-3xl bg-neutral-100 px-5 py-8 text-sm text-neutral-600">
        正在读取试穿资料...
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      {toast ? (
        <div className="fixed inset-x-5 top-5 z-50 mx-auto max-w-sm rounded-full bg-neutral-950 px-5 py-3 text-center text-sm font-semibold text-white shadow-2xl shadow-neutral-300">
          {toast}
        </div>
      ) : null}

      {message ? (
        <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-700">
          {message}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-950">人物照片</h2>
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="用户头像"
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : null}
        </div>

        <div className="relative min-h-96 overflow-hidden rounded-3xl bg-neutral-100">
          {profile?.front_photo_url ? (
            <img
              src={profile.front_photo_url}
              alt="正面全身照"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex min-h-96 items-center justify-center px-6 text-center text-sm leading-6 text-neutral-500">
              暂无正面全身照片，请先完成全身照上传。
            </div>
          )}
        </div>

        {profile ? (
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-neutral-600">
            <div className="rounded-2xl bg-neutral-100 px-2 py-3">
              {profile.height_cm}cm
            </div>
            <div className="rounded-2xl bg-neutral-100 px-2 py-3">
              {profile.weight_kg}kg
            </div>
            <div className="rounded-2xl bg-neutral-100 px-2 py-3">
              {profile.age ? `${profile.age}岁` : profile.gender}
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-950">整套搭配预览</h2>
          <span className="text-xs text-neutral-500">
            {selectedOutfitItems.length} 件
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {outfitSlots.map((slot) => {
            const item = selectedOutfitItems.find(
              (outfitItem) => outfitItem.slot === slot.key,
            );

            return (
              <div
                key={slot.key}
                className="min-h-24 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50"
              >
                {item ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center px-1 text-center text-xs text-neutral-400">
                    {slot.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hasSelectedOutfit ? (
          <button
            type="button"
            onClick={saveOutfit}
            disabled={isSavingOutfit}
            className="h-12 w-full rounded-full border border-neutral-200 text-sm font-semibold text-neutral-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:text-neutral-400"
          >
            {isSavingOutfit ? "保存中..." : "保存到我的穿搭"}
          </button>
        ) : null}
      </section>

      {outfits.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-950">我的穿搭</h2>
            <span className="text-xs text-neutral-500">{outfits.length} 套</span>
          </div>

          <div className="space-y-3">
            {outfits.map((outfit) => (
              <button
                key={outfit.id}
                type="button"
                onClick={() => applySavedOutfit(outfit)}
                className="w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white text-left shadow-lg shadow-neutral-200/60 transition active:scale-[0.99]"
              >
                <div className="grid grid-cols-5 gap-px bg-neutral-200">
                  {outfitSlots.map((slot) => {
                    const item = outfit.items.find(
                      (outfitItem) => outfitItem.slot === slot.key,
                    );

                    return (
                      <div key={slot.key} className="aspect-square bg-neutral-100">
                        {item ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">
                      {outfit.name}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {new Date(outfit.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                    套用
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-950">选择衣服</h2>
          <span className="text-xs text-neutral-500">{clothes.length} 件</span>
        </div>

        {clothes.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {clothes.map((item) => {
              const slot = getOutfitSlot(item.category);
              const isSelected =
                item.id === selectedClothingId ||
                Boolean(slot && outfitSelection[slot] === item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectClothing(item)}
                  className={`overflow-hidden rounded-3xl border bg-white text-left shadow-lg shadow-neutral-200/60 transition active:scale-[0.98] ${
                    isSelected
                      ? "border-neutral-950 ring-2 ring-neutral-950"
                      : "border-neutral-200"
                  }`}
                >
                  <span className="relative block aspect-[3/4] bg-neutral-100">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-950">
                      {item.category}
                    </span>
                  </span>
                  <span className="block space-y-1 p-3">
                    <span className="block truncate text-sm font-semibold text-neutral-950">
                      {item.name}
                    </span>
                    {item.brand ? (
                      <span className="block truncate text-xs text-neutral-500">
                        {item.brand}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-600">
            暂无服装，请先上传服装。
          </p>
        )}
      </section>

      {selectedClothing ? (
        <button
          type="button"
          onClick={startTryOn}
          disabled={isCreatingJob}
          className="h-14 w-full rounded-full bg-neutral-950 text-base font-semibold text-white shadow-lg shadow-neutral-300 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {isCreatingJob ? "创建任务中..." : "开始AI试穿"}
        </button>
      ) : null}
    </div>
  );
}
