"use client";

import { useEffect, useState } from "react";

type TryOnSelection = {
  profile: {
    front_photo_url: string | null;
  };
  clothing: {
    name: string;
    category: string;
    brand: string | null;
    image_url: string;
  };
};

export default function TryOnResultClient() {
  const [selection, setSelection] = useState<TryOnSelection | null>(null);

  useEffect(() => {
    const savedSelection = localStorage.getItem("virtual-fitting-try-on-selection");

    if (!savedSelection) {
      return;
    }

    try {
      setSelection(JSON.parse(savedSelection) as TryOnSelection);
    } catch (error) {
      console.error("Try-on selection parse error:", error);
    }
  }, []);

  if (!selection) {
    return (
      <p className="mt-8 rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-600">
        暂无试穿选择，请返回选择衣服。
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      <article className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg shadow-neutral-200/70">
        <div className="relative min-h-96 bg-neutral-100">
          {selection.profile.front_photo_url ? (
            <img
              src={selection.profile.front_photo_url}
              alt="已选择的人物照片"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex min-h-96 items-center justify-center px-6 text-center text-sm leading-6 text-neutral-500">
              暂无人物照片
            </div>
          )}
        </div>
        <div className="p-4">
          <h2 className="text-sm font-semibold text-neutral-950">已选择的人物照片</h2>
        </div>
      </article>

      <article className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg shadow-neutral-200/70">
        <div className="relative aspect-[3/4] bg-neutral-100">
          <img
            src={selection.clothing.image_url}
            alt={selection.clothing.name}
            className="h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-950">
            {selection.clothing.category}
          </span>
        </div>
        <div className="space-y-1 p-4">
          <h2 className="text-sm font-semibold text-neutral-950">
            {selection.clothing.name}
          </h2>
          {selection.clothing.brand ? (
            <p className="text-xs text-neutral-500">{selection.clothing.brand}</p>
          ) : null}
        </div>
      </article>
    </div>
  );
}
