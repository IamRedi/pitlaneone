import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const acceptedMediaTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const mediaFields = [
  ["brandAssetLogo", "logo", "logo_url", 3 * 1024 * 1024],
  ["brandAssetHero", "hero", "hero_image_url", 8 * 1024 * 1024],
  ["brandAssetHeroMobile", "hero-mobile", "hero_mobile_image_url", 8 * 1024 * 1024],
  ["brandAssetGalleryOne", "gallery-1", "gallery_one_image_url", 8 * 1024 * 1024],
  ["brandAssetGalleryTwo", "gallery-2", "gallery_two_image_url", 8 * 1024 * 1024],
  ["brandAssetGalleryThree", "gallery-3", "gallery_three_image_url", 8 * 1024 * 1024],
] as const;

export type BusinessSiteMediaSelection = ReturnType<typeof readBusinessSiteMedia>;

export function readBusinessSiteMedia(formData: FormData) {
  const files = mediaFields.flatMap(([formField, assetType, databaseField, maxBytes]) => {
    const file = formData.get(formField);
    return file instanceof File && file.size > 0
      ? [{ file, assetType, databaseField, maxBytes }]
      : [];
  });
  const invalid = files.some(
    ({ file, maxBytes }) =>
      !acceptedMediaTypes[file.type as keyof typeof acceptedMediaTypes] ||
      file.size > maxBytes,
  );
  return { files, invalid };
}

export async function uploadBusinessSiteMedia(
  supabase: SupabaseClient<Database>,
  companyId: string,
  selection: BusinessSiteMediaSelection,
) {
  if (!selection.files.length) return null;

  const uploadedPaths: string[] = [];
  const mediaUpdate: Database["public"]["Tables"]["company_theme_settings"]["Update"] = {};

  for (const { file, assetType, databaseField } of selection.files) {
    const extension = acceptedMediaTypes[file.type as keyof typeof acceptedMediaTypes];
    const path = `${companyId}/brand/${assetType}/${randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("company-assets").upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      if (uploadedPaths.length) await supabase.storage.from("company-assets").remove(uploadedPaths);
      return "Website-i u krijua, por fotot nuk u ngarkuan. Mund t'i shtosh te parametrat.";
    }
    uploadedPaths.push(path);
    mediaUpdate[databaseField] = supabase.storage.from("company-assets").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase
    .from("company_theme_settings")
    .update(mediaUpdate)
    .eq("company_id", companyId);
  if (error) {
    await supabase.storage.from("company-assets").remove(uploadedPaths);
    return "Website-i u krijua, por fotot nuk u ruajtën. Mund t'i shtosh te parametrat.";
  }

  return null;
}
