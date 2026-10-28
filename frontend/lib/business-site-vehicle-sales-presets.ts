import type { AppLocale } from "@/i18n/config";
import type { BusinessSitePresetCopy, BusinessSiteSubcategoryPreset } from "@/lib/business-site-preset-types";

const copy = (key: "dealer" | "import" | "leasing", services: readonly [string, string, string]): Record<AppLocale, BusinessSitePresetCopy> => {
  const values = {
    sq: {
      dealer: ["Autosallon i zgjedhur", "Automjete të kontrolluara, informacion i qartë dhe një proces blerjeje pa presion.", "Makina e duhur fillon me besim.", "Shiko stokun, krahaso opsionet dhe rezervo një provë në kohën që të përshtatet.", "Çdo automjet duhet të shpjegohet qartë.", "Të dhënat, historia dhe gjendja e automjetit paraqiten hapur që vendimi të jetë i sigurt.", "Automjete të disponueshme", "Zgjidh një automjet, jo vetëm një ofertë.", "Na trego modelin që kërkon dhe cakto një takim për ta parë nga afër."],
      import: ["Import automjetesh", "Gjejmë dhe sjellim automjetin që kërkon, me dokumentacion dhe komunikim të qartë.", "Automjeti që kërkon, nga tregu i duhur.", "Nga kërkimi te dorëzimi, çdo hap menaxhohet me transparencë.", "Importi i mirë fillon me një kërkesë të saktë.", "Ne filtrojmë opsionet, verifikojmë dokumentet dhe të mbajmë të informuar deri në dorëzim.", "Proces i qartë importi", "Nga kërkesa te çelësat.", "Dërgo modelin, buxhetin dhe preferencat e tua për një konsultë fillestare."],
      leasing: ["Leasing & financim", "Opsione financimi të shpjeguara thjesht për automjetin e ardhshëm tënd.", "Më shumë qartësi para se të vendosësh.", "Krahaso mundësitë e financimit dhe zgjidh ritmin që i përshtatet buxhetit tënd.", "Financimi duhet të jetë i kuptueshëm.", "Shpjegojmë kushtet dhe opsionet me qartësi, pa surpriza të panevojshme.", "Opsione fleksibël", "Një plan që ecën me ty.", "Na trego automjetin dhe buxhetin tënd; të kontaktojmë për opsionet."],
    },
    de: {
      dealer: ["Ausgewähltes Autohaus", "Geprüfte Fahrzeuge, klare Informationen und ein Kaufprozess ohne Druck.", "Das richtige Auto beginnt mit Vertrauen.", "Bestand ansehen, Optionen vergleichen und eine Probefahrt zum passenden Zeitpunkt buchen.", "Jedes Fahrzeug verdient eine klare Erklärung.", "Daten, Historie und Zustand werden offen dargestellt, damit Ihre Entscheidung sicher bleibt.", "Fahrzeuge im Bestand", "Ein Fahrzeug wählen, nicht nur ein Angebot.", "Nennen Sie uns Ihr Wunschmodell und vereinbaren Sie einen Termin vor Ort."],
      import: ["Fahrzeugimport", "Wir finden und liefern Ihr Wunschfahrzeug – mit klarer Dokumentation und Kommunikation.", "Ihr Wunschfahrzeug vom richtigen Markt.", "Von der Suche bis zur Übergabe wird jeder Schritt transparent begleitet.", "Ein guter Import beginnt mit einer präzisen Anfrage.", "Wir prüfen Optionen, Unterlagen und halten Sie bis zur Übergabe auf dem Laufenden.", "Import mit Überblick", "Von der Anfrage bis zum Schlüssel.", "Senden Sie Modell, Budget und Wünsche für ein erstes Gespräch."],
      leasing: ["Leasing & Finanzierung", "Einfach erklärte Finanzierungsoptionen für Ihr nächstes Fahrzeug.", "Mehr Klarheit vor der Entscheidung.", "Finanzierung vergleichen und eine Rate wählen, die zu Ihrem Budget passt.", "Finanzierung soll verständlich bleiben.", "Wir erklären Konditionen und Optionen klar – ohne unnötige Überraschungen.", "Flexible Möglichkeiten", "Ein Plan, der zu Ihnen passt.", "Nennen Sie Fahrzeug und Budget; wir melden uns mit passenden Optionen."],
    },
    en: {
      dealer: ["Selected car dealership", "Checked vehicles, clear information and a purchase process without pressure.", "The right car starts with trust.", "Browse the stock, compare options and book a viewing at a time that works for you.", "Every vehicle deserves a clear explanation.", "Vehicle details, history and condition are presented openly so you can decide with confidence.", "Available vehicles", "Choose a vehicle, not just an offer.", "Tell us the model you are looking for and arrange a personal viewing."],
      import: ["Vehicle import", "We find and deliver the vehicle you want with clear documentation and communication.", "The vehicle you want, from the right market.", "From search to handover, every step is managed transparently.", "A good import starts with a precise brief.", "We shortlist options, check documents and keep you informed until handover.", "Import with clarity", "From request to keys.", "Send the model, budget and preferences for an initial conversation."],
      leasing: ["Leasing & finance", "Clearly explained finance options for your next vehicle.", "More clarity before you decide.", "Compare finance options and choose a payment that fits your budget.", "Finance should remain understandable.", "We explain terms and options clearly, without unnecessary surprises.", "Flexible options", "A plan that moves with you.", "Tell us the vehicle and budget; we will contact you with suitable options."],
    },
  } as const;
  const fallback = values.en[key];
  const create = (locale: "sq" | "de" | "en"): BusinessSitePresetCopy => {
    const [eyebrow, description, heroTitle, heroSubtitle, aboutTitle, aboutBody, servicesTitle, galleryTitle, contactBody] = values[locale][key];
    return { description, heroEyebrow: eyebrow, heroTitle, heroSubtitle, aboutTitle, aboutBody, servicesTitle, services: services.map((title) => ({ title, description: locale === "de" ? "Klar vorgestellt und persönlich begleitet." : locale === "sq" ? "E paraqitur qartë dhe e shoqëruar personalisht." : "Clearly presented and personally supported." })) as unknown as BusinessSitePresetCopy["services"], galleryTitle, gallerySubtitle: locale === "de" ? "Auswahl, Details und aktuelle Fahrzeuge auf einen Blick." : locale === "sq" ? "Zgjedhje, detaje dhe automjete aktuale në një vend." : "Selection, details and current vehicles in one place.", contactTitle: locale === "de" ? "Lassen Sie uns über Ihr nächstes Fahrzeug sprechen." : locale === "sq" ? "Le të flasim për automjetin tënd të ardhshëm." : "Let us talk about your next vehicle.", contactBody };
  };
  return { sq: create("sq"), de: create("de"), en: create("en"), it: { ...create("en"), heroEyebrow: fallback[0] }, tr: { ...create("en"), heroEyebrow: fallback[0] }, pl: { ...create("en"), heroEyebrow: fallback[0] } };
};

const preset = (key: "auto_dealer" | "vehicle_import" | "leasing_finance", image: string, services: readonly [string, string, string], accent: string): BusinessSiteSubcategoryPreset => ({
  key,
  layout: "showroom",
  heroImage: image,
  theme: { primaryColor: "#17232C", accentColor: accent, backgroundColor: "#EEF2F3", surfaceColor: "#FCFDFC", textColor: "#1E2A30", buttonRadius: "soft", fontStyle: "modern" },
  copy: copy(key === "auto_dealer" ? "dealer" : key === "vehicle_import" ? "import" : "leasing", services),
});

export const vehicleSalesPresets = [
  preset("auto_dealer", "/images/templates/arctic-hero-v1.png", ["Shiko automjetet", "Rezervo provën", "Vlerëso ndërrimin"], "#59A6B5"),
  preset("vehicle_import", "/images/templates/olive-hero-v1.png", ["Kërko automjetin", "Kontrollo ofertën", "Organizo dorëzimin"], "#7D9A78"),
  preset("leasing_finance", "/images/templates/midnight-hero-v1.png", ["Konsultë financimi", "Krahaso opsionet", "Apliko për ofertë"], "#C88A57"),
] as const;
