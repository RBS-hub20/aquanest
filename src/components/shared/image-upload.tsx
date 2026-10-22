"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Image picker with preview. `capture` opens the camera on phones. */
export function ImageUpload({
  value,
  onChange,
  label,
  hint,
  capture,
  className,
}: {
  value: File | null;
  onChange: (f: File | null) => void;
  label: string;
  hint?: string;
  capture?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!value) return setPreview(null);
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  return (
    <div className={className}>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (f && f.size > 6 * 1024 * 1024) return alert("Max 6MB");
          onChange(f);
          e.target.value = "";
        }}
      />
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Upload preview" className="max-h-56 w-full object-cover" />
          <button type="button" onClick={() => onChange(null)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-navy shadow" aria-label="Remove">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={cn("flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-sky-200 bg-mist/60 px-4 py-6 text-center transition hover:border-ocean hover:bg-ocean-50")}
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-ocean shadow-sm">{capture ? <Camera className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />}</span>
          <span className="text-sm font-semibold text-ocean">{label}</span>
          {hint && <span className="text-xs text-navy-400">{hint}</span>}
        </button>
      )}
    </div>
  );
}
