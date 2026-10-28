"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { uploadGalleryImageForm } from "@/app/actions";
import { SubmitButton } from "@/components/forms";

export function AdminGalleryUpload() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <form action={uploadGalleryImageForm} className="space-y-3 border-t border-slate-200 pt-4">
      <div>
        <h3 className="text-sm font-bold text-ink">Ngarko foto galerie</h3>
        <p className="mt-1 text-xs leading-5 text-slate">Lejohen vetem imazhe deri ne 500kb.</p>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Titulli opsional
        <input name="title" placeholder="p.sh. Diagnostikim motorri" maxLength={120} />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Foto
        <input
          name="image"
          type="file"
          accept="image/*"
          required
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPreviewUrl((current) => {
              if (current) {
                URL.revokeObjectURL(current);
              }

              return file ? URL.createObjectURL(file) : null;
            });
          }}
        />
      </label>

      {previewUrl ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
          <Image src={previewUrl} alt="Preview foto galerie" width={640} height={420} className="h-48 w-full object-cover" unoptimized />
        </div>
      ) : null}

      <SubmitButton label="Ngarko foton" pendingLabel="Duke ngarkuar..." />
    </form>
  );
}
