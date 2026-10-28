import type { AppLocale } from "@/i18n/config";
import { findBusinessSiteSubcategoryPreset } from "@/lib/business-site-presets";

export type BusinessSiteTemplate = "studio" | "clarity" | "forge";
export type BusinessSiteGenerationSource = "manual_wizard" | "automated_engine" | "platform_demo";
export type LocalizedLabel = Record<AppLocale, string>;

export type BusinessSiteSubcategory = {
  key: string;
  label: LocalizedLabel;
};

export type BusinessSiteCategory = {
  key: string;
  label: LocalizedLabel;
  template: BusinessSiteTemplate;
  appointmentsDefault: boolean;
  productsDefault: boolean;
  subcategories: readonly BusinessSiteSubcategory[];
};

const label = (sq: string, de: string, en: string, it: string, tr: string, pl: string): LocalizedLabel => ({ sq, de, en, it, tr, pl });
const subcategory = (key: string, values: LocalizedLabel): BusinessSiteSubcategory => ({ key, label: values });

export const businessSiteCategories = [
  {
    key: "beauty_grooming", label: label("Bukuri & kujdes", "Beauty & Pflege", "Beauty & grooming", "Bellezza & cura", "Güzellik & bakım", "Uroda & pielęgnacja"), template: "studio", appointmentsDefault: true, productsDefault: true,
    subcategories: [
      subcategory("hair_salon", label("Sallon flokësh", "Friseursalon", "Hair salon", "Parrucchiere", "Kuaför", "Salon fryzjerski")),
      subcategory("barber", label("Barber", "Barbershop", "Barber", "Barbiere", "Berber", "Barber")),
      subcategory("nail_studio", label("Studio thonjsh", "Nagelstudio", "Nail studio", "Nail studio", "Tırnak stüdyosu", "Studio paznokci")),
      subcategory("lashes_brows", label("Qerpikë & vetulla", "Wimpern & Augenbrauen", "Lashes & brows", "Ciglia & sopracciglia", "Kirpik & kaş", "Rzęsy & brwi")),
      subcategory("beauty_studio", label("Studio bukurie", "Kosmetikstudio", "Beauty studio", "Centro estetico", "Güzellik stüdyosu", "Studio urody")),
    ],
  },
  {
    key: "wellness_therapy", label: label("Wellness & terapi", "Wellness & Therapie", "Wellness & therapy", "Benessere & terapia", "Wellness & terapi", "Wellness & terapia"), template: "studio", appointmentsDefault: true, productsDefault: true,
    subcategories: [
      subcategory("massage", label("Masazh", "Massage", "Massage", "Massaggio", "Masaj", "Masaż")),
      subcategory("physiotherapy", label("Fizioterapi", "Physiotherapie", "Physiotherapy", "Fisioterapia", "Fizyoterapi", "Fizjoterapia")),
      subcategory("osteopathy", label("Osteopati", "Osteopathie", "Osteopathy", "Osteopatia", "Osteopati", "Osteopatia")),
      subcategory("nutrition", label("Këshillim ushqimor", "Ernährungsberatung", "Nutrition", "Nutrizione", "Beslenme danışmanlığı", "Dietetyka")),
      subcategory("wellness_studio", label("Studio wellness", "Wellnessstudio", "Wellness studio", "Studio benessere", "Wellness stüdyosu", "Studio wellness")),
    ],
  },
  {
    key: "professional_services", label: label("Shërbime profesionale", "Professionelle Dienste", "Professional services", "Servizi professionali", "Profesyonel hizmetler", "Usługi profesjonalne"), template: "clarity", appointmentsDefault: true, productsDefault: false,
    subcategories: [
      subcategory("lawyer", label("Avokat", "Rechtsanwalt", "Lawyer", "Avvocato", "Avukat", "Prawnik")),
      subcategory("accountant", label("Kontabilist", "Steuerberatung", "Accountant", "Commercialista", "Muhasebeci", "Księgowość")),
      subcategory("insurance", label("Sigurime", "Versicherung", "Insurance", "Assicurazioni", "Sigorta", "Ubezpieczenia")),
      subcategory("consultant", label("Konsulent", "Beratung", "Consultant", "Consulenza", "Danışmanlık", "Doradztwo")),
      subcategory("architect", label("Arkitekt", "Architekt", "Architect", "Architetto", "Mimar", "Architekt")),
    ],
  },
  {
    key: "pet_services", label: label("Shërbime për kafshë", "Tierdienstleistungen", "Pet services", "Servizi per animali", "Evcil hayvan hizmetleri", "Usługi dla zwierząt"), template: "studio", appointmentsDefault: true, productsDefault: true,
    subcategories: [
      subcategory("pet_grooming", label("Kujdes për kafshë", "Tierpflege", "Pet grooming", "Toelettatura", "Evcil hayvan bakımı", "Grooming zwierząt")),
      subcategory("veterinary", label("Veterineri", "Tierarztpraxis", "Veterinary", "Veterinario", "Veteriner", "Weterynarz")),
      subcategory("dog_training", label("Trajnim qensh", "Hundeschule", "Dog training", "Addestramento cani", "Köpek eğitimi", "Szkolenie psów")),
      subcategory("pet_wellness", label("Wellness për kafshë", "Tierwellness", "Pet wellness", "Benessere animali", "Evcil hayvan wellness", "Wellness zwierząt")),
    ],
  },
  {
    key: "cleaning_services", label: label("Shërbime pastrimi", "Reinigungsdienste", "Cleaning services", "Servizi di pulizia", "Temizlik hizmetleri", "Usługi sprzątania"), template: "clarity", appointmentsDefault: true, productsDefault: false,
    subcategories: [
      subcategory("home_cleaning", label("Pastrim shtëpie", "Haushaltsreinigung", "Home cleaning", "Pulizia casa", "Ev temizliği", "Sprzątanie domów")),
      subcategory("office_cleaning", label("Pastrim zyrash", "Büroreinigung", "Office cleaning", "Pulizia uffici", "Ofis temizliği", "Sprzątanie biur")),
      subcategory("window_cleaning", label("Pastrim xhamash", "Fensterreinigung", "Window cleaning", "Pulizia vetri", "Cam temizliği", "Mycie okien")),
      subcategory("facility_service", label("Facility service", "Gebäudeservice", "Facility service", "Servizi edifici", "Bina hizmetleri", "Obsługa budynków")),
    ],
  },
  {
    key: "trade_services", label: label("Shërbime teknike", "Handwerk & Dienst", "Trade services", "Servizi tecnici", "Teknik hizmetler", "Usługi techniczne"), template: "forge", appointmentsDefault: true, productsDefault: true,
    subcategories: [
      subcategory("locksmith", label("Brava & çelësa", "Schlüsseldienst", "Locksmith", "Fabbro", "Çilingir", "Ślusarz")),
      subcategory("electrician", label("Elektricist", "Elektriker", "Electrician", "Elettricista", "Elektrikçi", "Elektryk")),
      subcategory("plumbing_heating", label("Hidraulik & ngrohje", "Sanitär & Heizung", "Plumbing & heating", "Idraulica & riscaldamento", "Tesisat & ısıtma", "Hydraulika & ogrzewanie")),
      subcategory("handyman", label("Shërbime shtëpie", "Hausmeisterservice", "Handyman", "Tuttofare", "Tamir hizmeti", "Złota rączka")),
    ],
  },
  {
    key: "delivery_transport", label: label("Dërgesa & transport", "Lieferung & Transport", "Delivery & transport", "Consegna & trasporto", "Teslimat & taşıma", "Dostawa & transport"), template: "forge", appointmentsDefault: true, productsDefault: false,
    subcategories: [
      subcategory("local_delivery", label("Dërgesa lokale", "Lokale Lieferung", "Local delivery", "Consegna locale", "Yerel teslimat", "Dostawa lokalna")),
      subcategory("courier", label("Kurier", "Kurierdienst", "Courier", "Corriere", "Kurye", "Kurier")),
      subcategory("moving_transport", label("Zhvendosje & transport", "Umzug & Transport", "Moving & transport", "Traslochi & trasporto", "Nakliye & taşıma", "Przeprowadzki & transport")),
    ],
  },
  {
    key: "garden_landscape", label: label("Kopsht & peizazh", "Garten- & Landschaftsbau", "Garden & landscape", "Giardino & paesaggio", "Bahçe & peyzaj", "Ogród & krajobraz"), template: "forge", appointmentsDefault: true, productsDefault: true,
    subcategories: [
      subcategory("garden_maintenance", label("Mirëmbajtje kopshti", "Gartenpflege", "Garden maintenance", "Manutenzione giardino", "Bahçe bakımı", "Pielęgnacja ogrodu")),
      subcategory("landscaping", label("Peizazh", "Landschaftsbau", "Landscaping", "Paesaggistica", "Peyzaj", "Architektura krajobrazu")),
      subcategory("tree_service", label("Shërbime pemësh", "Baumpflege", "Tree service", "Cura alberi", "Ağaç bakımı", "Pielęgnacja drzew")),
      subcategory("irrigation", label("Sisteme ujitjeje", "Bewässerung", "Irrigation", "Irrigazione", "Sulama", "Nawadnianie")),
    ],
  },
  {
    key: "vehicle_sales", label: label("Autosallone & automjete", "Autohaus & Fahrzeuge", "Car dealerships & vehicles", "Autosalone & veicoli", "Oto galeri & araçlar", "Salony samochodowe & pojazdy"), template: "clarity", appointmentsDefault: true, productsDefault: true,
    subcategories: [
      subcategory("auto_dealer", label("Autosallon & shitje", "Autohaus & Fahrzeugverkauf", "Car dealership & sales", "Autosalone & vendita", "Oto galeri & satış", "Salon samochodowy & sprzedaż")),
      subcategory("vehicle_import", label("Import automjetesh", "Fahrzeugimport", "Vehicle import", "Importazione veicoli", "Araç ithalatı", "Import pojazdów")),
      subcategory("leasing_finance", label("Leasing & financim", "Leasing & Finanzierung", "Leasing & finance", "Leasing & finanziamento", "Leasing & finansman", "Leasing & finansowanie")),
    ],
  },
  {
    key: "construction", label: label("Ndërtim & infrastrukturë", "Bau & Infrastruktur", "Construction & infrastructure", "Costruzione & infrastrutture", "İnşaat & altyapı", "Budowa & infrastruktura"), template: "forge", appointmentsDefault: true, productsDefault: false,
    subcategories: [
      subcategory("crane_service", label("Shërbime vinçi", "Kranservice", "Crane service", "Servizi gru", "Vinç hizmeti", "Usługi dźwigowe")),
      subcategory("deep_construction", label("Ndërtim nëntokësor", "Tiefbau", "Civil engineering", "Infrastrutture", "Altyapı inşaatı", "Budownictwo ziemne")),
      subcategory("house_construction", label("Ndërtim shtëpish", "Hausbau & Sanierung", "House construction", "Costruzione case", "Ev yapımı", "Budowa domów")),
      subcategory("glass_facade", label("Xham & fasada", "Glas & Fassade", "Glass & façade", "Vetro & facciate", "Cam & cephe", "Szkło & fasady")),
      subcategory("fiber_network", label("Fibër optike & rrjete", "Glasfaser & Netzwerktechnik", "Fibre optic & network services", "Fibra ottica & reti", "Fiber optik & ağ", "Światłowód & sieci")),
    ],
  },
] as const satisfies readonly BusinessSiteCategory[];

export type BusinessSiteGenerationInput = {
  name: string;
  slug: string;
  categoryKey: string;
  subcategoryKey: string;
  locale: AppLocale;
  source: BusinessSiteGenerationSource;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  services?: string[];
  appointmentsEnabled?: boolean;
  productsEnabled?: boolean;
  importPreference?: {
    source: "manual" | "website" | "google";
    sourceUrl?: string;
  };
  domainPreference?: {
    mode: "existing" | "later" | "search";
    domain?: string;
  };
  media?: {
    logoUrl?: string;
    heroImageUrl?: string;
    heroMobileImageUrl?: string;
    galleryImageUrls?: string[];
  };
};

const genericCopy: Record<AppLocale, { title: string; subtitle: string; aboutTitle: string; aboutBody: string; servicesTitle: string; contactTitle: string; contactBody: string; service: string }> = {
  sq: { title: "Shërbim lokal, i qartë dhe i besueshëm.", subtitle: "Informacioni, shërbimet dhe terminet në një vend të thjeshtë për klientët.", aboutTitle: "Punë e mirë. Komunikim i qartë.", aboutBody: "Ne e njohim punën tonë dhe kujdesemi që çdo klient të dijë çfarë të presë.", servicesTitle: "Si mund të ndihmojmë", contactTitle: "Na kontakto", contactBody: "Na dërgo kërkesën dhe do të të përgjigjemi personalisht.", service: "Shërbimi" },
  en: { title: "Local service, clear and dependable.", subtitle: "Information, services and appointments in one simple place for your customers.", aboutTitle: "Good work. Clear communication.", aboutBody: "We know our work and make sure every customer understands what to expect.", servicesTitle: "How we can help", contactTitle: "Contact us", contactBody: "Send your request and we will reply personally.", service: "Service" },
  de: { title: "Lokaler Service, klar und zuverlässig.", subtitle: "Informationen, Leistungen und Termine an einem einfachen Ort für Ihre Kunden.", aboutTitle: "Gute Arbeit. Klare Kommunikation.", aboutBody: "Wir verstehen unser Handwerk und sorgen dafür, dass jeder Kunde weiß, was ihn erwartet.", servicesTitle: "Wie wir helfen können", contactTitle: "Kontakt aufnehmen", contactBody: "Senden Sie Ihre Anfrage. Wir antworten persönlich.", service: "Leistung" },
  it: { title: "Servizio locale, chiaro e affidabile.", subtitle: "Informazioni, servizi e appuntamenti in un unico luogo semplice per i clienti.", aboutTitle: "Buon lavoro. Comunicazione chiara.", aboutBody: "Conosciamo il nostro lavoro e facciamo capire a ogni cliente cosa aspettarsi.", servicesTitle: "Come possiamo aiutare", contactTitle: "Contattaci", contactBody: "Invia la richiesta e risponderemo personalmente.", service: "Servizio" },
  tr: { title: "Yerel, net ve güvenilir hizmet.", subtitle: "Bilgiler, hizmetler ve randevular müşterileriniz için tek ve sade bir yerde.", aboutTitle: "İyi iş. Açık iletişim.", aboutBody: "İşimizi biliyor ve her müşterinin ne bekleyeceğini anlamasını sağlıyoruz.", servicesTitle: "Nasıl yardımcı olabiliriz", contactTitle: "Bize ulaşın", contactBody: "Talebinizi gönderin, kişisel olarak yanıtlayalım.", service: "Hizmet" },
  pl: { title: "Lokalna, jasna i niezawodna usługa.", subtitle: "Informacje, usługi i terminy w jednym prostym miejscu dla klientów.", aboutTitle: "Dobra praca. Jasna komunikacja.", aboutBody: "Znamy swoją pracę i dbamy, aby każdy klient wiedział, czego oczekiwać.", servicesTitle: "Jak możemy pomóc", contactTitle: "Skontaktuj się", contactBody: "Wyślij prośbę, a odpowiemy osobiście.", service: "Usługa" },
};

const themeValues: Record<BusinessSiteTemplate, { primaryColor: string; accentColor: string; backgroundColor: string; surfaceColor: string; textColor: string; buttonRadius: "sharp" | "soft" | "rounded"; fontStyle: "modern" | "serif" }> = {
  studio: { primaryColor: "#31231F", accentColor: "#C66A43", backgroundColor: "#FBF7F2", surfaceColor: "#FFFDFC", textColor: "#201916", buttonRadius: "soft", fontStyle: "serif" },
  clarity: { primaryColor: "#173C32", accentColor: "#84A99B", backgroundColor: "#F3F5F1", surfaceColor: "#FFFFFF", textColor: "#1D2925", buttonRadius: "soft", fontStyle: "modern" },
  forge: { primaryColor: "#1C1C19", accentColor: "#DD6B32", backgroundColor: "#E5DFD2", surfaceColor: "#F5F1E8", textColor: "#1C1C19", buttonRadius: "sharp", fontStyle: "modern" },
};

export function findBusinessSiteCategory(categoryKey: string) {
  return businessSiteCategories.find((category) => category.key === categoryKey);
}

export function buildBusinessSiteGenerationPlan(input: BusinessSiteGenerationInput) {
  const category = findBusinessSiteCategory(input.categoryKey);
  const selectedSubcategory = category?.subcategories.find((item) => item.key === input.subcategoryKey);
  if (!category || !selectedSubcategory) throw new Error("Unsupported BusinessSite category or subcategory.");

  const generic = genericCopy[input.locale];
  const preset = findBusinessSiteSubcategoryPreset(input.subcategoryKey);
  const curated = preset?.copy[input.locale];
  const suppliedServices = (input.services ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 3);
  const services = [0, 1, 2].map((index) => suppliedServices[index] || curated?.services[index].title || `${generic.service} ${index + 1}`);
  const serviceDescriptions = [0, 1, 2].map((index) =>
    suppliedServices[index]
      ? generic.subtitle
      : curated?.services[index].description || generic.subtitle,
  );
  const selectedTheme = preset?.theme ?? themeValues[category.template];
  const suppliedGalleryImages = (input.media?.galleryImageUrls ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 3);

  return {
    version: 1,
    source: input.source,
    categoryKey: category.key,
    subcategoryKey: selectedSubcategory.key,
    styleKey: preset?.layout ?? category.template,
    templatePreset: category.template,
    features: {
      appointments: input.appointmentsEnabled ?? category.appointmentsDefault,
      products: input.productsEnabled ?? category.productsDefault,
    },
    profile: {
      displayName: input.name,
      description: input.description?.trim() || curated?.description || generic.subtitle,
      phone: input.phone?.trim() || "",
      email: input.email?.trim() || "",
      address: input.address?.trim() || "",
      city: input.city?.trim() || "",
      country: input.country?.trim() || "",
      websiteLocale: input.locale,
      heroEyebrow: curated?.heroEyebrow || selectedSubcategory.label[input.locale],
      heroTitle: curated?.heroTitle || generic.title,
      heroSubtitle: input.description?.trim() || curated?.heroSubtitle || generic.subtitle,
      aboutTitle: curated?.aboutTitle || generic.aboutTitle,
      aboutBody: curated?.aboutBody || generic.aboutBody,
      servicesTitle: curated?.servicesTitle || generic.servicesTitle,
      serviceOneTitle: services[0], serviceOneDescription: serviceDescriptions[0],
      serviceTwoTitle: services[1], serviceTwoDescription: serviceDescriptions[1],
      serviceThreeTitle: services[2], serviceThreeDescription: serviceDescriptions[2],
      galleryTitle: curated?.galleryTitle || category.label[input.locale],
      gallerySubtitle: curated?.gallerySubtitle || selectedSubcategory.label[input.locale],
      contactTitle: curated?.contactTitle || generic.contactTitle,
      contactBody: curated?.contactBody || generic.contactBody,
    },
    theme: {
      themePreset: category.template,
      ...selectedTheme,
      logoUrl: input.media?.logoUrl?.trim() || "",
      heroImageUrl: input.media?.heroImageUrl?.trim() || preset?.heroImage || "",
      heroMobileImageUrl: input.media?.heroMobileImageUrl?.trim() || "",
      galleryOneImageUrl: suppliedGalleryImages[0] || "",
      galleryTwoImageUrl: suppliedGalleryImages[1] || "",
      galleryThreeImageUrl: suppliedGalleryImages[2] || "",
    },
    intake: {
      categoryKey: category.key,
      subcategoryKey: selectedSubcategory.key,
      locale: input.locale,
      description: input.description?.trim() || "",
      phone: input.phone?.trim() || "",
      email: input.email?.trim() || "",
      address: input.address?.trim() || "",
      city: input.city?.trim() || "",
      country: input.country?.trim() || "",
      services,
      importPreference: {
        source: input.importPreference?.source ?? "manual",
        sourceUrl: input.importPreference?.sourceUrl?.trim() || "",
      },
      domainPreference: {
        mode: input.domainPreference?.mode ?? "later",
        domain: input.domainPreference?.domain?.trim().toLowerCase() || "",
      },
    },
  } as const;
}
