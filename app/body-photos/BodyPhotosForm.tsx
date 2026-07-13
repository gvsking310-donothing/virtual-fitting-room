"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { getSupabaseErrorMessage } from "@/lib/supabase/errors";
import { fileToDataUrl, readTrialUser, saveTrialUser } from "@/lib/trial-store";

type PhotoField = "frontPhoto" | "sidePhoto";

type FormState = {
  frontPhoto: File | null;
  sidePhoto: File | null;
};

const initialState: FormState = {
  frontPhoto: null,
  sidePhoto: null,
};

function buildPreview(file: File | null) {
  return file ? URL.createObjectURL(file) : "";
}

async function uploadPhoto(file: File, folder: string) {
  if (!supabase) {
    throw new Error("Supabase 未配置。");
  }

  const fileExt = file.name.split(".").pop() ?? "jpg";
  const filePath = `${folder}/${crypto.randomUUID()}.${fileExt}`;
  const { error } = await supabase.storage
    .from("body-photos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Supabase error:", error);
    throw error;
  }

  const { data } = supabase.storage.from("body-photos").getPublicUrl(filePath);
  return data.publicUrl;
}

export default function BodyPhotosForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [savedPhotos, setSavedPhotos] = useState({
    frontPhotoUrl: "",
    sidePhotoUrl: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const frontPreview = useMemo(() => buildPreview(form.frontPhoto), [form.frontPhoto]);
  const sidePreview = useMemo(() => buildPreview(form.sidePhoto), [form.sidePhoto]);

  function handlePhotoChange(
    field: PhotoField,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setForm((current) => ({
      ...current,
      [field]: event.target.files?.[0] ?? null,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!form.frontPhoto) {
      setMessage("请先上传正面全身照。");
      return;
    }

    setIsSaving(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        const user = readTrialUser();

        if (!user) {
          setMessage("请先完成用户资料录入。");
          return;
        }

        const frontPhotoUrl = await fileToDataUrl(form.frontPhoto);
        const sidePhotoUrl = form.sidePhoto
          ? await fileToDataUrl(form.sidePhoto)
          : "";

        saveTrialUser({
          ...user,
          front_photo_url: frontPhotoUrl,
          side_photo_url: sidePhotoUrl || null,
        });
        setSavedPhotos({ frontPhotoUrl, sidePhotoUrl });
        setMessage("试用照片已保存。");
        return;
      }

      const userId = localStorage.getItem("virtual-fitting-user-id");

      if (!userId) {
        setMessage("请先完成用户资料录入。");
        return;
      }

      const frontPhotoUrl = await uploadPhoto(form.frontPhoto, "front");
      const sidePhotoUrl = form.sidePhoto
        ? await uploadPhoto(form.sidePhoto, "side")
        : "";

      const { error } = await supabase
        .from("users")
        .update({
          front_photo_url: frontPhotoUrl,
          side_photo_url: sidePhotoUrl || null,
        })
        .eq("id", userId);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      setSavedPhotos({ frontPhotoUrl, sidePhotoUrl });
      setMessage("照片上传成功。");
    } catch (error) {
      console.error("Supabase error:", error);
      setMessage(getSupabaseErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <PhotoUploader
        required
        label="正面全身照"
        file={form.frontPhoto}
        previewUrl={savedPhotos.frontPhotoUrl || frontPreview}
        onChange={(event) => handlePhotoChange("frontPhoto", event)}
      />

      <PhotoUploader
        label="侧面全身照（可选）"
        file={form.sidePhoto}
        previewUrl={savedPhotos.sidePhotoUrl || sidePreview}
        onChange={(event) => handlePhotoChange("sidePhoto", event)}
      />

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
        {isSaving ? "上传中..." : "保存照片"}
      </button>

      {savedPhotos.frontPhotoUrl ? (
        <Link
          href="/clothes"
          className="flex h-14 w-full items-center justify-center rounded-full border border-neutral-200 text-base font-semibold text-neutral-950 transition active:scale-[0.98]"
        >
          继续上传服装
        </Link>
      ) : null}
    </form>
  );
}

function PhotoUploader({
  file,
  label,
  onChange,
  previewUrl,
  required = false,
}: {
  file: File | null;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  previewUrl: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-3">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <span className="relative flex min-h-56 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-4 text-center transition active:scale-[0.99]">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={label}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="space-y-2">
            <span className="block text-sm font-semibold text-neutral-950">
              上传照片
            </span>
            <span className="block max-w-full truncate text-xs text-neutral-500">
              {file?.name ?? "支持 JPG / PNG"}
            </span>
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          required={required}
          className="sr-only"
          onChange={onChange}
        />
      </span>
    </label>
  );
}
