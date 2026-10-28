"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Monitor, Palette, Pencil, Smartphone, Trash2, X } from "lucide-react";
import { clearCompanyBrandAsset } from "@/app/saas-actions";
import { toAppLocale } from "@/i18n/config";
import { businessSiteDashboardCopy } from "@/lib/business-site-dashboard-copy";

type ThemeId =
  | "steel-copper"
  | "chrome"
  | "light-metal"
  | "crimson"
  | "atelier"
  | "velocity"
  | "studio"
  | "clarity"
  | "forge";
type WebsiteLocale = "sq" | "en" | "de" | "it" | "tr" | "pl";
type Draft = {
  [key: string]: string | boolean;
  isPublic: boolean;
  themePreset: ThemeId;
  websiteLocale: WebsiteLocale;
};
type AssetKey =
  | "logo"
  | "hero"
  | "heroMobile"
  | "serviceOne"
  | "serviceTwo"
  | "serviceThree"
  | "galleryOne"
  | "galleryTwo"
  | "galleryThree";
type Field = readonly [string, string, "text" | "textarea"];
type EditorSection = "basics" | "appearance" | "content" | "photos";
type PreviewMode = "desktop" | "mobile";

const themes: Record<
  ThemeId,
  {
    name: string;
    description: string;
    image: string;
    colors: string[];
    values: Record<
      | "primaryColor"
      | "accentColor"
      | "backgroundColor"
      | "surfaceColor"
      | "textColor",
      string
    >;
  }
> = {
  "steel-copper": {
    name: "Graphite",
    description: "Editorial i errët",
    image: "/images/templates/graphite-hero-v1.png",
    colors: ["#090C11", "#141B22", "#C96F3B"],
    values: {
      primaryColor: "#090C11",
      accentColor: "#C96F3B",
      backgroundColor: "#090C11",
      surfaceColor: "#141B22",
      textColor: "#F8FAFC",
    },
  },
  chrome: {
    name: "Olive",
    description: "Punëtori me qetësi",
    image: "/images/templates/olive-hero-v1.png",
    colors: ["#0C120C", "#182117", "#B9CF84"],
    values: {
      primaryColor: "#10170F",
      accentColor: "#B9CF84",
      backgroundColor: "#0C120C",
      surfaceColor: "#182117",
      textColor: "#F1F6EA",
    },
  },
  "light-metal": {
    name: "Arctic",
    description: "Teknologjik dhe preciz",
    image: "/images/templates/arctic-hero-v1.png",
    colors: ["#091119", "#132432", "#8CC8EE"],
    values: {
      primaryColor: "#0C1721",
      accentColor: "#8CC8EE",
      backgroundColor: "#091119",
      surfaceColor: "#132432",
      textColor: "#EDF7FE",
    },
  },
  crimson: {
    name: "Midnight",
    description: "Kinematik dhe i rafinuar",
    image: "/images/templates/midnight-hero-v1.png",
    colors: ["#070C1B", "#121E38", "#8EA9F5"],
    values: {
      primaryColor: "#0B132B",
      accentColor: "#8EA9F5",
      backgroundColor: "#070C1B",
      surfaceColor: "#121E38",
      textColor: "#EEF3FF",
    },
  },
  atelier: {
    name: "Atelier",
    description: "Editorial i hapur dhe elegant",
    image: "/images/templates/arctic-hero-v1.png",
    colors: ["#F7F1E8", "#FFFFFF", "#A7532B"],
    values: {
      primaryColor: "#F7F1E8",
      accentColor: "#A7532B",
      backgroundColor: "#F7F1E8",
      surfaceColor: "#FFFFFF",
      textColor: "#20201E",
    },
  },
  velocity: {
    name: "Velocity",
    description: "Sportiv, i guximshem dhe dinamik",
    image: "/images/templates/midnight-hero-v1.png",
    colors: ["#090A0F", "#171922", "#F05A28"],
    values: {
      primaryColor: "#090A0F",
      accentColor: "#F05A28",
      backgroundColor: "#090A0F",
      surfaceColor: "#171922",
      textColor: "#FFF8F4",
    },
  },
  studio: {
    name: "Editorial",
    description: "I ngrohtë, elegant dhe gati për sallon flokësh",
    image: "/images/templates/businesssite-hair-editorial-v1.png",
    colors: ["#F1E4D5", "#FFF8F0", "#B96648"],
    values: { primaryColor: "#392A24", accentColor: "#B96648", backgroundColor: "#F1E4D5", surfaceColor: "#FFF8F0", textColor: "#271D19" },
  },
  clarity: {
    name: "Lumen",
    description: "I ndritshëm, modern dhe i qetë për beauty studio",
    image: "/images/templates/businesssite-hair-lumen-v1.png",
    colors: ["#E5F1F7", "#F9FCFE", "#79B9D6"],
    values: { primaryColor: "#24485B", accentColor: "#79B9D6", backgroundColor: "#E5F1F7", surfaceColor: "#F9FCFE", textColor: "#173442" },
  },
  forge: {
    name: "Noir",
    description: "Luks i errët për salon premium dhe colour bar",
    image: "/images/templates/businesssite-hair-noir-v1.png",
    colors: ["#181B1C", "#252A2B", "#D6A34A"],
    values: { primaryColor: "#202526", accentColor: "#D6A34A", backgroundColor: "#181B1C", surfaceColor: "#252A2B", textColor: "#F6F2E9" },
  },
};

function Fold({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="overflow-hidden rounded-xl border border-slate-200">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-black text-slate-950">
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <span className="text-slate-400">+</span>
      </summary>
      <div className="border-t border-slate-100 p-4">{children}</div>
    </details>
  );
}

export function WebsiteEditor({
  companyId,
  initial,
  images,
  extraGallery,
  productSurface = "workshop",
}: {
  companyId: string;
  initial: Draft;
  images: Record<AssetKey, string | null>;
  extraGallery: string[];
  productSurface?: "workshop" | "business_site";
}) {
  const t = useTranslations("settings");
  const businessCopy = businessSiteDashboardCopy[toAppLocale(useLocale())];
  const [draft, setDraft] = useState(initial);
  const [assetPreviews, setAssetPreviews] = useState(images);
  const [activeSection, setActiveSection] = useState<EditorSection>("basics");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [openGroup, setOpenGroup] = useState("");
  const [editing, setEditing] = useState<{
    key: string;
    label: string;
    type: "text" | "textarea";
  } | null>(null);
  const [value, setValue] = useState("");
  const [assetPending, startAssetTransition] = useTransition();
  const inputRefs = useRef<Partial<Record<AssetKey, HTMLInputElement | null>>>(
    {},
  );
  const router = useRouter();
  useEffect(() => {
    const selectFromHash = () => {
      const section = window.location.hash.replace("#website-editor-", "");
      if (["basics", "appearance", "content", "photos"].includes(section)) {
        setActiveSection(section as EditorSection);
      }
    };
    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
  }, []);
  const availableThemes = (Object.keys(themes) as ThemeId[]).filter((id) =>
    productSurface === "business_site"
      ? ["studio", "clarity", "forge"].includes(id)
      : !["studio", "clarity", "forge"].includes(id),
  );
  const groups: readonly [string, readonly Field[]][] = [
    [
      t("publicProfile"),
      [
        ["displayName", t("publicName"), "text"],
        ["description", t("shortDescription"), "textarea"],
      ],
    ],
    [
      t("heroTitle"),
      [
        ["heroEyebrow", t("heroEyebrow"), "text"],
        ["heroTitle", t("heroTitle"), "textarea"],
        ["heroSubtitle", t("heroSubtitle"), "textarea"],
      ],
    ],
    [
      t("aboutTitle"),
      [
        ["aboutTitle", t("aboutTitle"), "text"],
        ["aboutBody", t("aboutBody"), "textarea"],
      ],
    ],
    [
      t("servicesTitle"),
      [
        ["servicesTitle", t("servicesTitle"), "text"],
        [
          "serviceOneTitle",
          t("service", { number: 1 }) + ": " + t("fieldTitle"),
          "text",
        ],
        [
          "serviceOneDescription",
          t("service", { number: 1 }) + ": " + t("fieldDescription"),
          "textarea",
        ],
        [
          "serviceTwoTitle",
          t("service", { number: 2 }) + ": " + t("fieldTitle"),
          "text",
        ],
        [
          "serviceTwoDescription",
          t("service", { number: 2 }) + ": " + t("fieldDescription"),
          "textarea",
        ],
        [
          "serviceThreeTitle",
          t("service", { number: 3 }) + ": " + t("fieldTitle"),
          "text",
        ],
        [
          "serviceThreeDescription",
          t("service", { number: 3 }) + ": " + t("fieldDescription"),
          "textarea",
        ],
      ],
    ],
    [
      t("galleryTitle"),
      [
        ["galleryTitle", t("galleryTitle"), "text"],
        ["gallerySubtitle", t("gallerySubtitle"), "textarea"],
      ],
    ],
    [
      t("contactTitle"),
      [
        ["contactTitle", t("contactTitle"), "text"],
        ["contactBody", t("contactBody"), "textarea"],
        ["phone", t("phone"), "text"],
        ["email", "Email", "text"],
        ["address", t("address"), "text"],
        ["whatsapp", "WhatsApp", "text"],
        ["instagramUrl", "Instagram (p.sh. instagram.com/emri)", "text"],
        ["facebookUrl", "Facebook (p.sh. facebook.com/emri)", "text"],
        ["tiktokUrl", "TikTok (p.sh. tiktok.com/@emri)", "text"],
        ["city", t("city"), "text"],
        ["country", t("country"), "text"],
        ["legalNoticeUrl", "Impressum URL", "text"],
        ["privacyPolicyUrl", "Datenschutz URL", "text"],
      ],
    ],
  ];
  const basicGroupNames = new Set([t("publicProfile"), t("contactTitle")]);
  const visibleGroups = activeSection === "basics"
    ? groups.filter(([group]) => basicGroupNames.has(group))
    : activeSection === "content"
      ? groups.filter(([group]) => !basicGroupNames.has(group))
      : [];
  const editorSections: { id: EditorSection; label: string }[] = [
    { id: "basics", label: t("publicProfile") },
    { id: "appearance", label: t("theme") },
    { id: "content", label: t("websiteTexts") },
    { id: "photos", label: t("websiteImages") },
  ];
  const assets: [AssetKey, string, string][] = [
    ["logo", t("logo"), "brandAssetLogo"],
    ["hero", t("heroImage"), "brandAssetHero"],
    ["heroMobile", t("heroImageMobile"), "brandAssetHeroMobile"],
    ["serviceOne", t("serviceOneImage"), "brandAssetServiceOne"],
    ["serviceTwo", t("serviceTwoImage"), "brandAssetServiceTwo"],
    ["serviceThree", t("serviceThreeImage"), "brandAssetServiceThree"],
    ["galleryOne", t("galleryOneImage"), "brandAssetGalleryOne"],
    ["galleryTwo", t("galleryTwoImage"), "brandAssetGalleryTwo"],
    ["galleryThree", t("galleryThreeImage"), "brandAssetGalleryThree"],
  ];
  const draftText = (key: string, fallback: string) => {
    const content = draft[key];
    return typeof content === "string" && content.trim() ? content : fallback;
  };
  const previewHero = previewMode === "mobile"
    ? assetPreviews.heroMobile || assetPreviews.hero
    : assetPreviews.hero;

  const openEdit = (key: string, label: string, type: "text" | "textarea") => {
    setValue(typeof draft[key] === "string" ? String(draft[key]) : "");
    setEditing({ key, label, type });
  };
  const apply = () => {
    if (editing) setDraft((current) => ({ ...current, [editing.key]: value }));
    setEditing(null);
  };
  const prepareImage = async (key: AssetKey, input: HTMLInputElement) => {
    const source = input.files?.[0];
    if (!source || !source.type.startsWith("image/")) return;
    try {
      const image = new Image();
      const objectUrl = URL.createObjectURL(source);
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("image"));
        image.src = objectUrl;
      });
      const maximum = key === "logo" ? 1000 : 1920;
      const scale = Math.min(
        1,
        maximum / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas
        .getContext("2d")
        ?.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.86),
      );
      URL.revokeObjectURL(objectUrl);
      if (!blob) return;
      const converted = new File(
        [blob],
        `${source.name.replace(/\.[^.]+$/, "")}.webp`,
        { type: "image/webp" },
      );
      const transfer = new DataTransfer();
      transfer.items.add(converted);
      input.files = transfer.files;
      setAssetPreviews((current) => ({
        ...current,
        [key]: URL.createObjectURL(converted),
      }));
    } catch {
      setAssetPreviews((current) => ({
        ...current,
        [key]: URL.createObjectURL(source),
      }));
    }
  };
  const removeAsset = (key: AssetKey) => {
    const current = assetPreviews[key];
    if (!current) return;
    if (current.startsWith("blob:")) {
      if (inputRefs.current[key]) inputRefs.current[key]!.value = "";
      setAssetPreviews((images) => ({ ...images, [key]: null }));
      return;
    }
    const assetType =
      key === "heroMobile"
        ? "hero-mobile"
        : key === "serviceOne"
          ? "service-1"
          : key === "serviceTwo"
            ? "service-2"
            : key === "serviceThree"
              ? "service-3"
              : key === "galleryOne"
                ? "gallery-1"
                : key === "galleryTwo"
                  ? "gallery-2"
                  : key === "galleryThree"
                    ? "gallery-3"
                    : key;
    startAssetTransition(async () => {
      const result = await clearCompanyBrandAsset(companyId, assetType);
      if (!result.ok) return;
      if (inputRefs.current[key]) inputRefs.current[key]!.value = "";
      setAssetPreviews((images) => ({ ...images, [key]: null }));
      router.refresh();
    });
  };

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-black uppercase tracking-[.18em] text-brand">
          {productSurface === "business_site" ? businessCopy.editorEyebrow : t("eyebrow")}
        </p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">
          {productSurface === "business_site" ? businessCopy.editorTitle : t("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {productSurface === "business_site" ? businessCopy.editorDescription : t("description")}
        </p>
      </div>
      {productSurface === "business_site" ? (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
            <div>
              <h3 className="text-sm font-black text-slate-950">{businessCopy.livePreview}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{businessCopy.previewHint}</p>
            </div>
            <div className="flex rounded-lg bg-slate-100 p-1" aria-label={businessCopy.livePreview}>
              {([
                ["desktop", businessCopy.desktop, Monitor],
                ["mobile", businessCopy.mobile, Smartphone],
              ] as const).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={previewMode === mode}
                  onClick={() => setPreviewMode(mode)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-black transition ${previewMode === mode ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-950"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto p-3 sm:p-5">
            <div
              data-testid="business-site-live-preview"
              className={`mx-auto overflow-hidden border border-black/10 shadow-xl transition-all duration-300 ${previewMode === "mobile" ? "max-w-[390px] rounded-[2rem]" : "w-full rounded-xl"}`}
              style={{
                backgroundColor: draftText("backgroundColor", "#f7f1e8"),
                color: draftText("textColor", "#20201e"),
              }}
            >
              <header className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  {assetPreviews.logo ? (
                    <img src={assetPreviews.logo} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black"
                      style={{ backgroundColor: draftText("accentColor", "#a7532b"), color: draftText("surfaceColor", "#fffdfc") }}
                    >
                      {draftText("displayName", "B").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="truncate text-sm font-black">{draftText("displayName", "BusinessSite")}</span>
                </div>
                <span
                  className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide"
                  style={{ backgroundColor: draftText("accentColor", "#a7532b"), color: draftText("surfaceColor", "#fffdfc") }}
                >
                  {draftText("contactTitle", t("contactTitle"))}
                </span>
              </header>
              <div className={`grid ${previewMode === "desktop" ? "min-h-[340px] grid-cols-2" : "grid-cols-1"}`}>
                <div className={`flex flex-col justify-center px-6 py-9 ${previewMode === "desktop" ? "sm:px-10" : "order-2"}`}>
                  <p className="text-[10px] font-black uppercase tracking-[.2em]" style={{ color: draftText("accentColor", "#a7532b") }}>
                    {draftText("heroEyebrow", businessCopy.editorEyebrow)}
                  </p>
                  <h4 className={`mt-3 font-black leading-[.98] ${previewMode === "desktop" ? "text-4xl lg:text-5xl" : "text-3xl"}`}>
                    {draftText("heroTitle", draftText("displayName", "BusinessSite"))}
                  </h4>
                  <p className="mt-4 line-clamp-3 max-w-md text-sm leading-6 opacity-70">
                    {draftText("heroSubtitle", draftText("description", businessCopy.editorDescription))}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {["serviceOneTitle", "serviceTwoTitle", "serviceThreeTitle"].map((key, index) => (
                      <span
                        key={key}
                        className="rounded-full border border-current/15 px-3 py-1.5 text-[10px] font-bold"
                        style={{ backgroundColor: draftText("surfaceColor", "#fffdfc") }}
                      >
                        {draftText(key, `${t("service", { number: index + 1 })}`)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`relative min-h-56 overflow-hidden ${previewMode === "mobile" ? "order-1 mx-4 rounded-2xl" : "m-4 ml-0 rounded-xl"}`} style={{ backgroundColor: draftText("primaryColor", "#31231f") }}>
                  {previewHero ? (
                    <img src={previewHero} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-white/50">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      <nav aria-label={t("title")} className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:flex">
        {editorSections.map((section) => (
          <button
            key={section.id}
            id={`website-editor-${section.id}`}
            type="button"
            onClick={() => {
              setActiveSection(section.id);
              setOpenGroup("");
              window.history.replaceState(null, "", `#website-editor-${section.id}`);
            }}
            className={`scroll-mt-28 rounded-lg px-3 py-2.5 text-xs font-black transition sm:min-w-32 ${activeSection === section.id ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-950"}`}
          >
            {section.label}
          </button>
        ))}
      </nav>
      <div className="mt-5 grid gap-3">
        {activeSection === "appearance" ? <Fold
          title={t("theme")}
          icon={<Palette className="h-4 w-4 text-brand" />}
          defaultOpen
        >
          <p className="text-xs text-slate-600">{t("templateStyle")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {availableThemes.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    themePreset: id,
                    ...themes[id].values,
                  }))
                }
                className={`overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 hover:shadow-md ${draft.themePreset === id ? "border-brand ring-2 ring-brand/25" : "border-slate-200"}`}
              >
                <img
                  src={themes[id].image}
                  alt=""
                  className="h-20 w-full object-cover"
                />
                <span className="block p-2.5">
                  <span className="flex overflow-hidden rounded">
                    {themes[id].colors.map((color) => (
                      <span
                        key={color}
                        className="h-2 flex-1"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  <span className="mt-2 block text-xs font-black text-slate-800">
                    {themes[id].name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {themes[id].description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Fold> : null}
        {activeSection === "basics" ? <Fold title={t("websiteLanguage")} defaultOpen>
          <p className="text-xs leading-5 text-slate-600">
            {t("websiteLanguageHint")}
          </p>
          <label className="mt-3 grid max-w-sm gap-1.5 text-xs font-bold text-slate-800">
            <span>{t("websiteLanguage")}</span>
            <select
              value={draft.websiteLocale}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  websiteLocale: event.target.value as WebsiteLocale,
                }))
              }
            >
              <option value="sq">Shqip</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="tr">Türkçe</option>
              <option value="pl">Polski</option>
            </select>
          </label>
        </Fold> : null}
        {activeSection === "photos" ? <Fold
          title={t("websiteImages")}
          icon={<ImageIcon className="h-4 w-4 text-brand" />}
          defaultOpen
        >
          <p className="text-xs leading-5 text-slate-600">
            {t("websiteImagesHint")} {t("imageFileHint", { limit: "1920 px" })}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {assets.map(([key, label, name]) => (
              <div
                key={key}
                className="flex items-center gap-2 rounded-lg border border-slate-200 p-2"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 hover:text-brand">
                  <span className="h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    {assetPreviews[key] ? (
                      <img
                        src={assetPreviews[key] ?? undefined}
                        alt={label}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 text-xs font-bold text-slate-800">
                    {label}
                  </span>
                  <Pencil className="h-3.5 w-3.5 text-brand" />
                  <input
                    ref={(input) => {
                      inputRefs.current[key] = input;
                    }}
                    className="sr-only"
                    name={name}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      void prepareImage(key, event.currentTarget)
                    }
                  />
                </label>
                {assetPreviews[key] ? (
                  <button
                    type="button"
                    disabled={assetPending}
                    onClick={() => removeAsset(key)}
                    className="rounded-md p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    aria-label={t("removeImage", { name: label })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </Fold> : null}
        {activeSection === "photos" ? <Fold title={t("galleryTitle")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{t("gallerySubtitle")}</p>
            <label className="cursor-pointer rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">
              {t("upload")}
              <input
                name="brandAssetGalleryExtra"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
              />
            </label>
          </div>
          {extraGallery.length ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {extraGallery.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt={t("galleryTitle")}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          ) : null}
        </Fold> : null}
        {visibleGroups.map(([group, fields]) => (
          <section
            key={group}
            className="overflow-hidden rounded-xl border border-slate-200"
          >
            <button
              type="button"
              onClick={() => setOpenGroup(openGroup === group ? "" : group)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-black text-slate-900"
            >
              <span>{group}</span>
              <span className="text-slate-400">
                {openGroup === group ? "−" : "+"}
              </span>
            </button>
            {openGroup === group ? (
              <div className="grid gap-1 border-t border-slate-100 p-2 sm:grid-cols-2">
                {fields.map(([key, label, type]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openEdit(key, label, type)}
                    className="flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4 shrink-0 text-brand" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-800">
                        {label}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {String(draft[key] || "—")}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ))}
      </div>
      <input type="hidden" name="isPublic" value={draft.isPublic ? "on" : ""} />
      {Object.entries(draft)
        .filter(([key]) => key !== "isPublic")
        .map(([key, fieldValue]) => (
          <input
            key={key}
            type="hidden"
            name={key}
            value={String(fieldValue)}
          />
        ))}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-brand">
                  {t("websiteTexts")}
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {editing.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {editing.type === "textarea" ? (
              <textarea
                autoFocus
                rows={6}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-950 outline-none focus:border-brand"
              />
            ) : (
              <input
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-950 outline-none focus:border-brand"
              />
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm font-bold text-slate-700"
              >
                {t("back")}
              </button>
              <button
                type="button"
                onClick={apply}
                className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
              >
                {t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
