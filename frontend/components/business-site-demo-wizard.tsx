"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Globe2, Images, Package, Sparkles } from "lucide-react";
import { createBusinessSiteDemo, createBusinessSiteSelfService } from "@/app/businesssite-actions";
import { SubmitButton } from "@/components/forms";
import type { AppLocale } from "@/i18n/config";
import { buildBusinessSiteGenerationPlan, businessSiteCategories } from "@/lib/business-site-engine";
import { findBusinessSiteSubcategoryPreset } from "@/lib/business-site-presets";

const steps = ["Biznesi", "Të dhënat", "Përmbajtja", "Fotot", "Preview"] as const;
const selfServiceDraftKey = "pitlaneone:businesssite-onboarding:v1";

type BusinessSiteWizardMode = "admin_demo" | "self_service";
type BusinessSiteDraft = {
  step: number;
  categoryKey: string;
  subcategoryKey: string;
  locale: AppLocale;
  businessName: string;
  slug: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  services: string[];
  appointmentsEnabled: boolean;
  productsEnabled: boolean;
  importSource: "manual" | "website" | "google";
  importSourceUrl: string;
  domainMode: "existing" | "later" | "search";
  domainName: string;
};

type MediaKey = "logo" | "hero" | "heroMobile" | "galleryOne" | "galleryTwo" | "galleryThree";

const mediaFields: { key: MediaKey; name: string; label: string; hint: string; logo?: boolean }[] = [
  { key: "logo", name: "brandAssetLogo", label: "Logoja", hint: "PNG, JPG ose WebP deri në 3 MB", logo: true },
  { key: "hero", name: "brandAssetHero", label: "Fotoja kryesore", hint: "Pamja desktop, deri në 8 MB" },
  { key: "heroMobile", name: "brandAssetHeroMobile", label: "Fotoja për telefon", hint: "Opsionale; përdoret fotoja kryesore nëse lihet bosh" },
  { key: "galleryOne", name: "brandAssetGalleryOne", label: "Galeria 1", hint: "Foto pune ose ambienti" },
  { key: "galleryTwo", name: "brandAssetGalleryTwo", label: "Galeria 2", hint: "Opsionale" },
  { key: "galleryThree", name: "brandAssetGalleryThree", label: "Galeria 3", hint: "Opsionale" },
];

function createSlug(value: string) {
  return value.replace(/ß/g, "ss").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63);
}

export function BusinessSiteDemoWizard({ mode = "admin_demo" }: { mode?: BusinessSiteWizardMode }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [categoryKey, setCategoryKey] = useState<string>(businessSiteCategories[0].key);
  const [subcategoryKey, setSubcategoryKey] = useState<string>(businessSiteCategories[0].subcategories[0].key);
  const [locale, setLocale] = useState<AppLocale>("de");
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Germany");
  const [services, setServices] = useState(["", "", ""]);
  const [appointmentsEnabled, setAppointmentsEnabled] = useState<boolean>(businessSiteCategories[0].appointmentsDefault);
  const [productsEnabled, setProductsEnabled] = useState<boolean>(businessSiteCategories[0].productsDefault);
  const [importSource, setImportSource] = useState<BusinessSiteDraft["importSource"]>("manual");
  const [importSourceUrl, setImportSourceUrl] = useState("");
  const [domainMode, setDomainMode] = useState<BusinessSiteDraft["domainMode"]>("later");
  const [domainName, setDomainName] = useState("");
  const [draftReady, setDraftReady] = useState(mode === "admin_demo");
  const [stepMessage, setStepMessage] = useState("");
  const [mediaPreviews, setMediaPreviews] = useState<Partial<Record<MediaKey, string>>>({});
  const category = useMemo(() => businessSiteCategories.find((item) => item.key === categoryKey) ?? businessSiteCategories[0], [categoryKey]);
  const visualPreset = findBusinessSiteSubcategoryPreset(subcategoryKey);
  const previewPlan = useMemo(() => buildBusinessSiteGenerationPlan({
    name: businessName.trim() || "Emri i biznesit",
    slug: slug || "preview",
    categoryKey,
    subcategoryKey,
    locale,
    source: "manual_wizard",
    description,
    phone,
    email,
    address,
    city,
    country,
    services,
    appointmentsEnabled,
    productsEnabled,
    importPreference: { source: importSource, sourceUrl: importSourceUrl },
    domainPreference: { mode: domainMode, domain: domainName },
  }), [appointmentsEnabled, address, businessName, categoryKey, city, country, description, domainMode, domainName, email, importSource, importSourceUrl, locale, phone, productsEnabled, services, slug, subcategoryKey]);
  const stepIsReady = step === 0
    ? businessName.trim().length >= 2 && slug.length >= 3
    : step === 1
      ? description.trim().length >= 10 && Boolean(phone.trim() || email.trim())
      : true;
  const formAction = mode === "self_service" ? createBusinessSiteSelfService : createBusinessSiteDemo;

  useEffect(() => {
    if (mode !== "self_service") return;
    try {
      const stored = window.localStorage.getItem(selfServiceDraftKey);
      if (!stored) return;
      const draft = JSON.parse(stored) as Partial<BusinessSiteDraft>;
      const restoredCategory = businessSiteCategories.find((item) => item.key === draft.categoryKey);
      const restoredSubcategory = restoredCategory?.subcategories.find((item) => item.key === draft.subcategoryKey);
      if (restoredCategory) {
        setCategoryKey(restoredCategory.key);
        setSubcategoryKey(restoredSubcategory?.key ?? restoredCategory.subcategories[0].key);
      }
      if (["sq", "en", "de", "it", "tr", "pl"].includes(draft.locale ?? "")) setLocale(draft.locale as AppLocale);
      if (typeof draft.businessName === "string") setBusinessName(draft.businessName);
      if (typeof draft.slug === "string") { setSlug(draft.slug); setSlugEdited(Boolean(draft.slug)); }
      if (typeof draft.description === "string") setDescription(draft.description);
      if (typeof draft.phone === "string") setPhone(draft.phone);
      if (typeof draft.email === "string") setEmail(draft.email);
      if (typeof draft.address === "string") setAddress(draft.address);
      if (typeof draft.city === "string") setCity(draft.city);
      if (typeof draft.country === "string") setCountry(draft.country);
      if (Array.isArray(draft.services)) setServices([0, 1, 2].map((index) => typeof draft.services?.[index] === "string" ? draft.services[index] : ""));
      if (typeof draft.appointmentsEnabled === "boolean") setAppointmentsEnabled(draft.appointmentsEnabled);
      if (typeof draft.productsEnabled === "boolean") setProductsEnabled(draft.productsEnabled);
      if (["manual", "website", "google"].includes(draft.importSource ?? "")) setImportSource(draft.importSource as BusinessSiteDraft["importSource"]);
      if (typeof draft.importSourceUrl === "string") setImportSourceUrl(draft.importSourceUrl);
      if (["existing", "later", "search"].includes(draft.domainMode ?? "")) setDomainMode(draft.domainMode as BusinessSiteDraft["domainMode"]);
      if (typeof draft.domainName === "string") setDomainName(draft.domainName);
      if (typeof draft.step === "number") setStep(Math.max(0, Math.min(steps.length - 1, draft.step)));
    } catch {
      window.localStorage.removeItem(selfServiceDraftKey);
    } finally {
      setDraftReady(true);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "self_service" || !draftReady) return;
    const draft: BusinessSiteDraft = { step, categoryKey, subcategoryKey, locale, businessName, slug, description, phone, email, address, city, country, services, appointmentsEnabled, productsEnabled, importSource, importSourceUrl, domainMode, domainName };
    window.localStorage.setItem(selfServiceDraftKey, JSON.stringify(draft));
  }, [address, appointmentsEnabled, businessName, categoryKey, city, country, description, domainMode, domainName, draftReady, email, importSource, importSourceUrl, locale, mode, phone, productsEnabled, services, slug, step, subcategoryKey]);

  function clearDraft() {
    window.localStorage.removeItem(selfServiceDraftKey);
    window.location.reload();
  }

  function selectCategory(nextKey: string) {
    const nextCategory = businessSiteCategories.find((item) => item.key === nextKey) ?? businessSiteCategories[0];
    setCategoryKey(nextCategory.key);
    setSubcategoryKey(nextCategory.subcategories[0].key);
    setAppointmentsEnabled(nextCategory.appointmentsDefault);
    setProductsEnabled(nextCategory.productsDefault);
  }

  function updateService(index: number, value: string) {
    setServices((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  }

  async function prepareMedia(key: MediaKey, input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    let uploadFile = file;
    try {
      const imageUrl = URL.createObjectURL(file);
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = reject;
        element.src = imageUrl;
      });
      const maximum = key === "logo" ? 1000 : 1920;
      const scale = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
      URL.revokeObjectURL(imageUrl);
      if (blob) {
        uploadFile = new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
        const transfer = new DataTransfer();
        transfer.items.add(uploadFile);
        input.files = transfer.files;
      }
    } catch {
      // Keep the source file only when a browser cannot convert it.
    }
    setMediaPreviews((current) => {
      const previous = current[key];
      if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous);
      return { ...current, [key]: URL.createObjectURL(uploadFile) };
    });
  }

  function moveToStep(nextStep: number) {
    setStep(Math.max(0, Math.min(steps.length - 1, nextStep)));
    setStepMessage("");
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return <form ref={formRef} action={formAction} className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="grid grid-cols-5 border-b border-slate-200 bg-slate-50">{steps.map((label, index) => <button key={label} type="button" onClick={() => index < step && moveToStep(index)} className={`flex items-center justify-center gap-2 px-1.5 py-4 text-[11px] font-black uppercase tracking-[.06em] sm:px-2 sm:text-xs ${index === step ? "bg-white text-brand" : index < step ? "text-emerald-700" : "text-slate-400"}`}>{index < step ? <Check className="h-3.5 w-3.5" /> : <span>0{index + 1}</span>}<span className="hidden md:inline">{label}</span></button>)}</div>

    <div className={step === 0 ? "grid gap-5 p-5 sm:grid-cols-2 sm:p-7" : "hidden"}>
      <div className="sm:col-span-2"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Hapi 1</p>{mode === "self_service" ? <button type="button" onClick={clearDraft} className="text-xs font-bold text-slate-500 underline-offset-4 hover:text-slate-950 hover:underline">Fshi draftin</button> : null}</div><h2 className="mt-1 text-2xl font-black text-slate-950">Çfarë biznesi po krijojmë?</h2><p className="mt-2 text-sm text-slate-600">Kategoria zgjedh strukturën fillestare; çdo gjë mund të ndryshohet më pas.</p>{mode === "self_service" ? <p className="mt-3 text-xs font-semibold text-emerald-700">Hapi dhe të dhënat ruhen automatikisht në këtë pajisje. Fotot duhen zgjedhur përsëri pas rikthimit.</p> : null}</div>
      <fieldset className="grid gap-3 sm:col-span-2"><legend className="text-sm font-black text-slate-900">Nga do të nisim?</legend><div className="grid gap-3 sm:grid-cols-3">{([ ["manual", "Nis nga zero", "Plotëso të dhënat e biznesit vetë."], ["website", "Kam website", "Ruaj linkun për import automatik."], ["google", "Kam Google", "Ruaj profilin e Google për import."] ] as const).map(([value, title, detail]) => <label key={value} className={`cursor-pointer rounded-xl border p-4 transition ${importSource === value ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-slate-200 hover:border-slate-400"}`}><input className="sr-only" type="radio" name="importSource" value={value} checked={importSource === value} onChange={() => setImportSource(value)} /><span className="block font-black text-slate-950">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{detail}</span></label>)}</div>{importSource !== "manual" ? <label className="grid gap-2 text-sm font-bold text-slate-800">{importSource === "website" ? "Linku i website-it aktual" : "Linku i profilit Google"}<input name="importSourceUrl" type="url" maxLength={2048} value={importSourceUrl} onChange={(event) => setImportSourceUrl(event.target.value)} placeholder={importSource === "website" ? "https://biznesi-juaj.de" : "https://www.google.com/maps/..."} /><span className="text-xs font-medium text-slate-500">Do të përdoret sapo të lidhet engine-i i importit. Mund të vazhdosh edhe pa të.</span></label> : <input type="hidden" name="importSourceUrl" value="" />}</fieldset>
      <label className="grid gap-2 text-sm font-bold text-slate-800 sm:col-span-2">Emri i biznesit<input name="name" required minLength={2} maxLength={80} value={businessName} onChange={(event) => { const nextName = event.target.value; setBusinessName(nextName); if (!slugEdited) setSlug(createSlug(nextName)); }} placeholder="Studio Aurora Münster" /></label>
      <label className="grid gap-2 text-sm font-bold text-slate-800">Linku i website-it<input name="slug" required minLength={3} maxLength={63} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(createSlug(event.target.value)); }} placeholder="studio-aurora-munster" /><span className="text-xs font-medium text-slate-500">Krijohet vetë nga emri dhe mund të ndryshohet.</span></label>
      <label className="grid gap-2 text-sm font-bold text-slate-800">Gjuha e website-it<select name="websiteLocale" value={locale} onChange={(event) => setLocale(event.target.value as AppLocale)}><option value="de">Deutsch</option><option value="en">English</option><option value="sq">Shqip</option><option value="it">Italiano</option><option value="tr">Türkçe</option><option value="pl">Polski</option></select></label>
      <label className="grid gap-2 text-sm font-bold text-slate-800">Kategoria<select name="categoryKey" value={categoryKey} onChange={(event) => selectCategory(event.target.value)}>{businessSiteCategories.map((item) => <option key={item.key} value={item.key}>{item.label.sq}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold text-slate-800">Nënkategoria<select name="subcategoryKey" value={subcategoryKey} onChange={(event) => setSubcategoryKey(event.target.value)}>{category.subcategories.map((item) => <option key={item.key} value={item.key}>{item.label.sq}</option>)}</select></label>
      {visualPreset ? <div className="relative min-h-56 overflow-hidden rounded-2xl sm:col-span-2" style={{ background: visualPreset.theme.primaryColor }}><img src={visualPreset.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" /><div className="relative max-w-sm p-6 text-white"><span className="text-xs font-black uppercase tracking-[.16em]" style={{ color: visualPreset.theme.accentColor }}>{visualPreset.copy[locale].heroEyebrow}</span><p className="mt-4 text-3xl font-black leading-tight">{visualPreset.copy[locale].heroTitle}</p><p className="mt-3 text-sm leading-6 text-white/75">Stili, ngjyrat dhe tekstet vendosen automatikisht dhe mbeten të editueshme.</p></div></div> : null}
    </div>

    <div className={step === 1 ? "grid gap-5 p-5 sm:grid-cols-2 sm:p-7" : "hidden"}>
      <div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Hapi 2</p><h2 className="mt-1 text-2xl font-black text-slate-950">Të dhënat bazë</h2><p className="mt-2 text-sm text-slate-600">Këto fusha ushqejnë të njëjtin engine që mund të thirret edhe automatikisht.</p></div>
      <label className="grid gap-2 text-sm font-bold text-slate-800 sm:col-span-2">Përshkrim i shkurtër<textarea name="description" rows={3} maxLength={320} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Çfarë ofron biznesi dhe për kë?" /></label>
      <label className="grid gap-2 text-sm font-bold text-slate-800">Telefon<input name="phone" maxLength={40} inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      <label className="grid gap-2 text-sm font-bold text-slate-800">Email<input name="email" maxLength={160} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="grid gap-2 text-sm font-bold text-slate-800 sm:col-span-2">Adresa<input name="address" maxLength={180} value={address} onChange={(event) => setAddress(event.target.value)} /></label>
      <label className="grid gap-2 text-sm font-bold text-slate-800">Qyteti<input name="city" maxLength={100} value={city} onChange={(event) => setCity(event.target.value)} /></label>
      <label className="grid gap-2 text-sm font-bold text-slate-800">Shteti<input name="country" maxLength={100} value={country} onChange={(event) => setCountry(event.target.value)} /></label>
      <fieldset className="grid gap-3 sm:col-span-2"><legend className="text-sm font-black text-slate-900">Domain-i i website-it</legend><div className="grid gap-3 sm:grid-cols-3">{([ ["existing", "Kam domain", "Shkruaj domain-in që ke tashmë."], ["later", "Më vonë", "Krijo website-in dhe vendose më pas."], ["search", "Dua domain të ri", "Ruaj emrin që dëshiron manualisht."] ] as const).map(([value, title, detail]) => <label key={value} className={`cursor-pointer rounded-xl border p-4 transition ${domainMode === value ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-slate-200 hover:border-slate-400"}`}><input className="sr-only" type="radio" name="domainMode" value={value} checked={domainMode === value} onChange={() => setDomainMode(value)} /><span className="block font-black text-slate-950">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{detail}</span></label>)}</div>{domainMode !== "later" ? <label className="grid gap-2 text-sm font-bold text-slate-800">{domainMode === "existing" ? "Domain-i aktual" : "Domain-i që dëshiron"}<input name="domainName" maxLength={253} value={domainName} onChange={(event) => setDomainName(event.target.value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))} placeholder="biznesi-juaj.de" /><span className="text-xs font-medium text-slate-500">Ruhet vetëm si kërkesë manuale; kontrolli dhe blerja bëhen më vonë.</span></label> : <input type="hidden" name="domainName" value="" />}</fieldset>
    </div>

    <div className={step === 2 ? "grid gap-5 p-5 sm:grid-cols-2 sm:p-7" : "hidden"}>
      <div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Hapi 3</p><h2 className="mt-1 text-2xl font-black text-slate-950">Përmbajtja fillestare</h2><p className="mt-2 text-sm text-slate-600">Nëse shërbimet lihen bosh, engine-i përdor shembujt profesionalë të nënkategorisë.</p></div>
      {services.map((service, index) => <label key={index} className="grid gap-2 text-sm font-bold text-slate-800 sm:col-span-2">Shërbimi {index + 1}<input name={`service${index + 1}`} maxLength={120} value={service} onChange={(event) => updateService(index, event.target.value)} placeholder={index === 0 ? "p.sh. Konsultë personale" : "Opsionale"} /></label>)}
      <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input name="appointmentsEnabled" type="checkbox" checked={appointmentsEnabled} onChange={(event) => setAppointmentsEnabled(event.target.checked)} className="mt-1 h-4 w-4" /><span><span className="flex items-center gap-2 font-black text-slate-950"><Globe2 className="h-4 w-4 text-brand" />Termine online</span><span className="mt-1 block text-xs leading-5 text-slate-600">Kërkesat vijnë direkt në app.</span></span></label>
      <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input name="productsEnabled" type="checkbox" checked={productsEnabled} onChange={(event) => setProductsEnabled(event.target.checked)} className="mt-1 h-4 w-4" /><span><span className="flex items-center gap-2 font-black text-slate-950"><Images className="h-4 w-4 text-brand" />Produkte & oferta</span><span className="mt-1 block text-xs leading-5 text-slate-600">Katalog prezantues, jo webshop.</span></span></label>
      {mode === "admin_demo" ? <label className="grid gap-2 text-sm font-bold text-slate-800 sm:col-span-2">Ditët e provës<input name="trialDays" type="number" min={1} max={31} defaultValue={15} /></label> : <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 sm:col-span-2">Website-i, terminet dhe katalogu krijohen në të njëjtin plan prove 10-ditor të llogarisë. Modulet e tjera nuk aktivizohen.</p>}
      <input type="hidden" name="generationSource" value="manual_wizard" />
    </div>

    <div className={step === 3 ? "grid gap-5 p-5 sm:grid-cols-2 sm:p-7" : "hidden"}>
      <div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Hapi 4</p><h2 className="mt-1 text-2xl font-black text-slate-950">Logoja dhe fotot</h2><p className="mt-2 text-sm text-slate-600">Mund të përdorësh fotot e sugjeruara nga template-i ose t’i zëvendësosh tani. Të gjitha mbeten të editueshme më pas.</p></div>
      {mediaFields.map((field) => {
        const selectedPreview = mediaPreviews[field.key];
        const fallbackPreview = field.key === "hero" || field.key === "heroMobile" ? visualPreset?.heroImage : undefined;
        return <label key={field.key} className="group grid cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-brand/50 hover:bg-brand/5">
          <span className="relative flex min-h-36 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            {selectedPreview || fallbackPreview ? <img src={selectedPreview || fallbackPreview} alt="" className={`absolute inset-0 h-full w-full ${field.logo ? "object-contain p-5" : "object-cover"}`} /> : <span className="grid place-items-center gap-2 text-center text-slate-400"><Images className="mx-auto h-7 w-7" /><span className="text-xs font-bold">Foto opsionale</span></span>}
            {selectedPreview ? <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white">E zgjedhur</span> : null}
          </span>
          <span><span className="block text-sm font-black text-slate-900">{field.label}</span><span className="mt-1 block text-xs font-medium text-slate-500">{field.hint}</span></span>
          <input name={field.name} type="file" accept="image/jpeg,image/png,image/webp" className="text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:font-bold file:text-white" onChange={(event) => void prepareMedia(field.key, event.currentTarget)} />
        </label>;
      })}
    </div>

    <div className={step === 4 ? "p-5 sm:p-7" : "hidden"}>
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Hapi 5</p><h2 className="mt-1 text-2xl font-black text-slate-950">Kontrollo përpara krijimit</h2><p className="mt-2 text-sm text-slate-600">Ky është versioni fillestar që do të krijojë engine-i. Fotot, logoja dhe tekstet mbeten të editueshme.</p></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-[.14em] text-slate-500">Burimi i të dhënave</p><p className="mt-2 font-black text-slate-950">{importSource === "manual" ? "Nis nga zero" : importSource === "website" ? "Website aktual" : "Profil Google"}</p><p className="mt-1 break-all text-xs leading-5 text-slate-600">{importSource === "manual" ? "Do të përdoren të dhënat që ke plotësuar." : importSourceUrl || "Linku mund të shtohet më vonë para importit."}</p></section>
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-[.14em] text-slate-500">Plani i domain-it</p><p className="mt-2 font-black text-slate-950">{domainMode === "existing" ? "Domain ekzistues" : domainMode === "search" ? "Kërkesë për domain të ri" : "Vendoset më vonë"}</p><p className="mt-1 break-all text-xs leading-5 text-slate-600">{domainMode === "later" ? "Website-i nis fillimisht me adresën e platformës." : domainName || "Emri i domain-it mund të shtohet më vonë."}</p></section>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 shadow-xl" style={{ background: previewPlan.theme.backgroundColor, color: previewPlan.theme.textColor }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: `${previewPlan.theme.textColor}18`, background: previewPlan.theme.surfaceColor }}><div className="flex items-center gap-2"><span className="grid h-8 w-8 overflow-hidden place-items-center text-xs font-black text-white" style={{ background: previewPlan.theme.primaryColor, borderRadius: previewPlan.theme.buttonRadius === "rounded" ? "999px" : previewPlan.theme.buttonRadius === "soft" ? "12px" : "0" }}>{mediaPreviews.logo ? <img src={mediaPreviews.logo} alt="" className="h-full w-full object-contain" /> : previewPlan.profile.displayName.slice(0, 1).toUpperCase()}</span><strong className="text-sm">{previewPlan.profile.displayName}</strong></div><span className="text-xs font-bold opacity-60">/{slug || "preview"}</span></div>
        <div className="grid lg:grid-cols-[.88fr_1.12fr]"><div className="flex flex-col justify-center p-6 sm:p-10"><span className="text-xs font-black uppercase tracking-[.16em]" style={{ color: previewPlan.theme.accentColor }}>{previewPlan.profile.heroEyebrow}</span><h3 className="mt-4 text-4xl font-black leading-[.95] sm:text-5xl">{previewPlan.profile.heroTitle}</h3><p className="mt-5 max-w-lg text-sm leading-6 opacity-70">{previewPlan.profile.heroSubtitle}</p>{appointmentsEnabled ? <span className="mt-6 inline-flex w-fit items-center gap-2 px-4 py-3 text-xs font-black text-white" style={{ background: previewPlan.theme.accentColor, borderRadius: previewPlan.theme.buttonRadius === "rounded" ? "999px" : previewPlan.theme.buttonRadius === "soft" ? "14px" : "0" }}><CalendarDays className="h-4 w-4" />Termin online</span> : null}</div><div className="relative min-h-72 overflow-hidden"><img src={mediaPreviews.hero || previewPlan.theme.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" /><p className="absolute bottom-5 left-5 right-5 text-2xl font-black text-white">{previewPlan.profile.servicesTitle}</p></div></div>
        <div className="border-y p-6 sm:p-10" style={{ borderColor: `${previewPlan.theme.textColor}18`, background: previewPlan.theme.surfaceColor }}><div className="grid gap-3 sm:grid-cols-3">{[previewPlan.profile.serviceOneTitle, previewPlan.profile.serviceTwoTitle, previewPlan.profile.serviceThreeTitle].map((title, index) => <div key={title} className="border p-4" style={{ borderColor: `${previewPlan.theme.textColor}20`, borderRadius: previewPlan.theme.buttonRadius === "rounded" ? "22px" : previewPlan.theme.buttonRadius === "soft" ? "12px" : "0" }}><span className="text-xs font-black" style={{ color: previewPlan.theme.accentColor }}>0{index + 1}</span><p className="mt-3 font-bold">{title}</p></div>)}</div></div>
        <div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto] sm:items-end sm:p-10"><div><h4 className="text-2xl font-black">{previewPlan.profile.aboutTitle}</h4><p className="mt-3 max-w-xl text-sm leading-6 opacity-70">{previewPlan.profile.aboutBody}</p></div><div className="flex flex-wrap gap-2">{appointmentsEnabled ? <span className="inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold"><CalendarDays className="h-3.5 w-3.5" />Termine</span> : null}{productsEnabled ? <span className="inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold"><Package className="h-3.5 w-3.5" />Produkte & oferta</span> : null}</div></div>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7"><div><button type="button" disabled={step === 0} onClick={() => moveToStep(step - 1)} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-slate-600 disabled:invisible"><ArrowLeft className="h-4 w-4" />Prapa</button>{stepMessage ? <p className="mt-1 text-xs font-semibold text-rose-700">{stepMessage}</p> : null}</div>{step < steps.length - 1 ? <button type="button" onClick={() => { if (!stepIsReady) { setStepMessage(step === 0 ? "Vendos emrin dhe linkun e website-it per te vazhduar." : "Shto pershkrimin dhe telefon ose email."); return; } moveToStep(step + 1); }} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white">Vazhdo<ArrowRight className="h-4 w-4" /></button> : <div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-brand" /><SubmitButton label="Gjenero website-in" pendingLabel="Po gjenerohet..." /></div>}</div>
  </form>;
}
