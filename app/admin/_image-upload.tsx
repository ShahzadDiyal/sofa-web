"use client";

/* Shared "upload from device" field: picks an image, uploads it to Cloudinary
   via /api/admin/upload, and hands the public URL back through onChange. */

import { useRef, useState } from "react";
import { IconPlus, IconTrash } from "@/components/Icons";
import { uploadImage } from "./_ui";

interface Props {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  hint?: string;
}

export default function ImageUploadField({ value, onChange, folder = "uploads", label, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadImage(file, folder);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      {label && <p className="text-[13px] font-semibold mb-2">{label}</p>}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-[104px] h-[104px] rounded-[16px] overflow-hidden bg-cream border border-line flex-none grid place-items-center">
          {uploading ? (
            <div className="w-full h-full skeleton" aria-label="Uploading…" />
          ) : value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Uploaded preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted text-[12px] px-2 text-center">No image</span>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1 basis-[180px]">
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 bg-cream border-[1.5px] border-line rounded-full px-4 min-h-[40px] text-[14px] font-semibold hover:bg-sand disabled:opacity-50"
            >
              <IconPlus size={15} />
              {uploading ? "Uploading…" : value ? "Replace image" : "Upload from device"}
            </button>
            {value && !uploading && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-2 text-[14px] text-muted hover:text-ink min-h-[40px] px-2"
                aria-label="Remove image"
              >
                <IconTrash size={15} /> Remove
              </button>
            )}
          </div>
          {hint && <p className="text-muted text-[13px]">{hint}</p>}
          {error && <p className="text-[13px] text-[#B3402F]">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label={label ?? "Upload image"}
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
