"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { getSupabaseErrorMessage } from "@/lib/supabase/errors";

const categories = [
  "上衣",
  "裤子",
  "裙子",
  "外套",
  "鞋子",
  "帽子",
  "包包",
  "首饰",
] as const;

type Category = (typeof categories)[number];

type ClothingItem = {
  id: string;
  name: string;
  category: Category;
  brand: string | null;
  image_url: string;
  image_path: string;
  created_at: string;
};

type FormState = {
  name: string;
  category: Category;
  brand: string;
  image: File | null;
};

const initialState: FormState = {
  name: "",
  category: "上衣",
  brand: "",
  image: null,
};

function getPreview(file: File | null) {
  return file ? URL.createObjectURL(file) : "";
}

async function uploadClothingImage(file: File, category: Category) {
  if (!supabase) {
    throw new Error("Supabase 未配置。");
  }

  const fileExt = file.name.split(".").pop() ?? "jpg";
  const filePath = `${category}/${crypto.randomUUID()}.${fileExt}`;
  const { error } = await supabase.storage.from("clothes").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Supabase error:", error);
    throw error;
  }

  const { data } = supabase.storage.from("clothes").getPublicUrl(filePath);
  return {
    imageUrl: data.publicUrl,
    imagePath: filePath,
  };
}

export default function ClothesForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const imagePreview = useMemo(() => getPreview(form.image), [form.image]);

  function updateField(name: keyof FormState, value: string | File | null) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    updateField("image", event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!form.image) {
      setMessage("请先上传服装图片。");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("请先在 Vercel 配置 Supabase 环境变量。");
      return;
    }

    setIsSaving(true);

    try {
      const { imageUrl, imagePath } = await uploadClothingImage(
        form.image,
        form.category,
      );

      const { data, error } = await supabase
        .from("clothes")
        .insert({
          name: form.name,
          category: form.category,
          brand: form.brand || null,
          image_url: imageUrl,
        })
        .select("id, name, category, brand, image_url, created_at")
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      const clothing = {
        ...data,
        category: data.category as Category,
        image_path: imagePath,
      };

      setItems((current) => [clothing, ...current]);
      setForm(initialState);
      setMessage("服装上传成功。");
    } catch (error) {
      console.error("Supabase error:", error);
      setMessage(getSupabaseErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item: ClothingItem) {
    setMessage("");

    if (!supabase) {
      setMessage("Supabase 未配置。");
      return;
    }

    try {
      const { error: storageError } = await supabase.storage
        .from("clothes")
        .remove([item.image_path]);

      if (storageError) {
        console.error("Supabase error:", storageError);
        throw storageError;
      }

      const { error } = await supabase.from("clothes").delete().eq("id", item.id);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      setMessage("已删除。");
    } catch (error) {
      console.error("Supabase error:", error);
      setMessage(getSupabaseErrorMessage(error));
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-neutral-700">名称</span>
          <input
            required
            type="text"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="例如：黑色西装外套"
            className="h-13 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-neutral-700">分类</span>
          <select
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            className="h-13 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-neutral-700">品牌（可选）</span>
          <input
            type="text"
            value={form.brand}
            onChange={(event) => updateField("brand", event.target.value)}
            placeholder="请输入品牌"
            className="h-13 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
          />
        </label>

        <label className="block space-y-3">
          <span className="text-sm font-medium text-neutral-700">图片</span>
          <span className="relative flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-4 text-center transition active:scale-[0.99]">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="服装预览"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <span className="space-y-2">
                <span className="block text-sm font-semibold text-neutral-950">
                  上传服装图片
                </span>
                <span className="block text-xs text-neutral-500">
                  支持 JPG / PNG
                </span>
              </span>
            )}
            <input
              required
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleImageChange}
            />
          </span>
        </label>

        {message ? (
          <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-700">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSaving}
          className="h-14 w-full rounded-full bg-neutral-950 text-base font-semibold text-white shadow-lg shadow-neutral-300 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {isSaving ? "上传中..." : "上传服装"}
        </button>
      </form>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg shadow-neutral-200/70"
            >
              <div className="relative aspect-[3/4] bg-neutral-100">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-950">
                  {item.category}
                </span>
              </div>
              <div className="space-y-3 p-3">
                <div>
                  <h2 className="truncate text-sm font-semibold text-neutral-950">
                    {item.name}
                  </h2>
                  {item.brand ? (
                    <p className="mt-1 truncate text-xs text-neutral-500">
                      {item.brand}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="h-10 w-full rounded-full border border-neutral-200 text-sm font-medium text-neutral-700 transition active:scale-[0.98]"
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
