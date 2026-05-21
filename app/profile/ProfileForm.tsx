"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

type Gender = "" | "female" | "male" | "other";

type FormState = {
  height: string;
  weight: string;
  gender: Gender;
  age: string;
  avatar: File | null;
};

const initialState: FormState = {
  height: "",
  weight: "",
  gender: "",
  age: "",
  avatar: null,
};

export default function ProfileForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const avatarName = useMemo(() => {
    if (!form.avatar) {
      return "支持 JPG / PNG";
    }

    return form.avatar.name;
  }, [form.avatar]);

  function updateField(name: keyof FormState, value: string | File | null) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    updateField("avatar", event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!form.height || !form.weight || !form.gender) {
      setMessage("请先填写身高、体重和性别。");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("请先在 Vercel 配置 Supabase 环境变量。");
      return;
    }

    setIsSaving(true);

    try {
      let avatarUrl = "";

      if (form.avatar) {
        const fileExt = form.avatar.name.split(".").pop() ?? "jpg";
        const filePath = `avatars/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, form.avatar, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        avatarUrl = data.publicUrl;
      }

      const { data, error } = await supabase
        .from("users")
        .insert({
          height_cm: Number(form.height),
          weight_kg: Number(form.weight),
          gender: form.gender,
          age: form.age ? Number(form.age) : null,
          avatar_url: avatarUrl || null,
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      localStorage.setItem("virtual-fitting-user-id", data.id);
      setMessage("资料已保存，正在进入下一步。");
      setForm(initialState);
      router.push("/body-photos");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-neutral-700">身高</span>
        <input
          required
          min="1"
          name="height"
          type="number"
          inputMode="decimal"
          value={form.height}
          onChange={(event) => updateField("height", event.target.value)}
          placeholder="请输入身高 cm"
          className="h-13 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-neutral-700">体重</span>
        <input
          required
          min="1"
          name="weight"
          type="number"
          inputMode="decimal"
          value={form.weight}
          onChange={(event) => updateField("weight", event.target.value)}
          placeholder="请输入体重 kg"
          className="h-13 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-neutral-700">性别</span>
        <select
          required
          name="gender"
          value={form.gender}
          onChange={(event) => updateField("gender", event.target.value)}
          className="h-13 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
        >
          <option value="">请选择</option>
          <option value="female">女</option>
          <option value="male">男</option>
          <option value="other">其他</option>
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-neutral-700">年龄（可选）</span>
        <input
          min="1"
          max="120"
          name="age"
          type="number"
          inputMode="numeric"
          value={form.age}
          onChange={(event) => updateField("age", event.target.value)}
          placeholder="请输入年龄"
          className="h-13 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
        />
      </label>

      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-4 text-center transition active:scale-[0.99]">
        <span className="text-sm font-semibold text-neutral-950">上传头像</span>
        <span className="max-w-full truncate text-xs text-neutral-500">
          {avatarName}
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleAvatarChange}
        />
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
        {isSaving ? "保存中..." : "下一步"}
      </button>
    </form>
  );
}
