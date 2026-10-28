import Link from "next/link";
import { GalleryPreview, type GalleryImage } from "@/components/gallery-preview";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const supabase = await createServerSupabase();
  const { data: galleryImages, error: galleryImagesError } = await supabase
    .from("gallery_images")
    .select("id, image_url, title")
    .order("created_at", { ascending: false })
    .limit(12);

  if (galleryImagesError) {
    console.error("GALLERY PAGE QUERY ERROR:", galleryImagesError);
  }

  const publicGalleryImages: GalleryImage[] =
    galleryImages?.map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      title: image.title || "Foto servisi",
      detail: "Pune reale nga galeria e servisit."
    })) ?? [];

  return (
    <main className="grid gap-6">
      <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-dark">Punet e fundit</p>
            <h1 className="mt-2 text-4xl font-black text-ink">Galeria e servisit</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate">
              Foto nga puna e servisit. Nese ende nuk ka foto te ngarkuara, shfaqen placeholder te perkohshem.
            </p>
          </div>
          <Link href="/" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800">
            Kthehu
          </Link>
        </div>
      </section>

      <GalleryPreview images={publicGalleryImages} />
    </main>
  );
}
