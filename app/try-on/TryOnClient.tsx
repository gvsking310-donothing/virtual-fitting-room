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

export default function TryOnClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [selectedClothingId, setSelectedClothingId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const selectedClothing = useMemo(
    () => clothes.find((item) => item.id === selectedClothingId) ?? null,
    [clothes, selectedClothingId],
  );

  useEffect(() => {
    async function loadTryOnData() {
      setMessage("");

      if (!isSupabaseConfigured || !supabase) {
        setMessage("请先在 Vercel 配置 Supabase 环境变量。");
        setIsLoading(false);
        return;
      }

      const userId = localStorage.getItem("virtual-fitting-user-id");

      if (!userId) {
        setMessage("请先完成用户资料录入。");
        setIsLoading(false);
        return;
      }

      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select(
            "id, height_cm, weight_kg, gender, age, avatar_url, front_photo_url",
          )
          .eq("id", userId)
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
      } catch (error) {
        console.error("Supabase error:", error);
        setMessage(getSupabaseErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadTryOnData();
  }, []);

  function startTryOn() {
    if (!selectedClothing) {
      return;
    }

    localStorage.setItem(
      "virtual-fitting-selected-clothing",
      JSON.stringify(selectedClothing),
    );
    router.push("/try-on/processing");
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
          <h2 className="text-sm font-semibold text-neutral-950">选择衣服</h2>
          <span className="text-xs text-neutral-500">{clothes.length} 件</span>
        </div>

        {clothes.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {clothes.map((item) => {
              const isSelected = item.id === selectedClothingId;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedClothingId(item.id)}
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
          className="h-14 w-full rounded-full bg-neutral-950 text-base font-semibold text-white shadow-lg shadow-neutral-300 transition active:scale-[0.98]"
        >
          开始AI试穿
        </button>
      ) : null}
    </div>
  );
}
