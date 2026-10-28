import type { AppLocale } from "@/i18n/config";
import type { BusinessSitePresetCopy, BusinessSiteSubcategoryPreset } from "@/lib/business-site-preset-types";

const makeCopy = (label: { sq: string; de: string; en: string }, services: readonly [string, string, string]): Record<AppLocale, BusinessSitePresetCopy> => {
  const build = (name: string, language: "sq" | "de" | "en"): BusinessSitePresetCopy => ({
    description: language === "de" ? `Professionelle Leistungen für ${name} mit klarer Planung und zuverlässiger Ausführung.` : language === "sq" ? `Shërbime profesionale për ${name}, me plan të qartë dhe realizim të besueshëm.` : `Professional ${name} services with clear planning and reliable execution.`,
    heroEyebrow: name,
    heroTitle: language === "de" ? "Präzise geplant. Sicher umgesetzt." : language === "sq" ? "Planifikim i saktë. Realizim i sigurt." : "Precisely planned. Safely delivered.",
    heroSubtitle: language === "de" ? "Ein klarer Ablauf, ein eingespieltes Team und Arbeit, auf die Sie bauen können." : language === "sq" ? "Proces i qartë, ekip i koordinuar dhe punë mbi të cilën mund të mbështeteni." : "A clear process, a coordinated team and work you can rely on.",
    aboutTitle: language === "de" ? "Gute Arbeit beginnt vor Ort." : language === "sq" ? "Puna e mirë fillon në terren." : "Good work begins on site.",
    aboutBody: language === "de" ? "Wir prüfen Anforderungen, koordinieren die Arbeit und halten Sie über die nächsten Schritte auf dem Laufenden." : language === "sq" ? "Vlerësojmë nevojat, koordinojmë punën dhe ju mbajmë të informuar për hapat e ardhshëm." : "We assess the requirements, coordinate the work and keep you informed about every next step.",
    servicesTitle: language === "de" ? "Leistungen im Überblick" : language === "sq" ? "Shërbimet kryesore" : "Core services",
    services: [0, 1, 2].map((index) => ({ title: services[index], description: language === "de" ? "Sorgfältig geplant und professionell ausgeführt." : language === "sq" ? "E planifikuar me kujdes dhe e realizuar profesionalisht." : "Carefully planned and professionally delivered." })) as unknown as BusinessSitePresetCopy["services"],
    galleryTitle: language === "de" ? "Einblicke in unsere Arbeit" : language === "sq" ? "Pamje nga puna jonë" : "A closer look at our work",
    gallerySubtitle: language === "de" ? "Details, Abläufe und Ergebnisse aus dem Einsatz." : language === "sq" ? "Detaje, proces dhe rezultate nga terreni." : "Details, process and results from the field.",
    contactTitle: language === "de" ? "Ihr Projekt beginnt mit einer Anfrage." : language === "sq" ? "Projekti juaj fillon me një kërkesë." : "Your project starts with an enquiry.",
    contactBody: language === "de" ? "Senden Sie Ort, Umfang und gewünschten Zeitraum. Wir melden uns persönlich." : language === "sq" ? "Dërgoni vendin, përmasën dhe afatin e dëshiruar. Ju përgjigjemi personalisht." : "Send the location, scope and preferred timeframe. We will respond personally.",
  });
  return { sq: build(label.sq, "sq"), de: build(label.de, "de"), en: build(label.en, "en"), it: build(label.en, "en"), tr: build(label.en, "en"), pl: build(label.en, "en") };
};

const preset = (key: string, layout: BusinessSiteSubcategoryPreset["layout"], image: string, label: { sq: string; de: string; en: string }, services: readonly [string, string, string], primary: string, accent: string): BusinessSiteSubcategoryPreset => ({
  key, layout, heroImage: image,
  theme: { primaryColor: primary, accentColor: accent, backgroundColor: "#EEE8DE", surfaceColor: "#FAF7F1", textColor: "#222520", buttonRadius: "sharp", fontStyle: "modern" },
  copy: makeCopy(label, services),
});

export const constructionPresets = [
  preset("crane_service", "field", "/images/templates/businesssite-construction-crane-v1.png", { sq: "Shërbime vinçi", de: "Kranservice", en: "Crane service" }, ["Mobilkran", "Montim", "Planifikim ngritjeje"], "#202326", "#E1B547"),
  preset("deep_construction", "terrain", "/images/templates/businesssite-construction-deep-v1.png", { sq: "Ndërtim nëntokësor", de: "Tiefbau", en: "Civil engineering" }, ["Gërmim", "Kanalizime", "Përgatitje trualli"], "#292E2A", "#C88642"),
  preset("house_construction", "craft", "/images/templates/businesssite-construction-house-v1.png", { sq: "Ndërtim shtëpish", de: "Hausbau & Sanierung", en: "House construction" }, ["Ndërtim i ri", "Rinovim", "Riparime ndërtimi"], "#3A332C", "#C97845"),
  preset("glass_facade", "crystal", "/images/templates/businesssite-construction-glass-v1.png", { sq: "Xham & fasada", de: "Glas & Fassade", en: "Glass & façade" }, ["Fasada xhami", "Dyer & ndarje", "Riparim"], "#1E3440", "#85BCCA"),
  preset("fiber_network", "voltage", "/images/templates/businesssite-construction-fiber-v1.png", { sq: "Fibër optike & rrjete", de: "Glasfaser & Netzwerktechnik", en: "Fibre optic & network services" }, ["Glasfaser-Hausanschluss", "Netzwerkinstallation", "Messung & Störung"], "#19364A", "#71C7D8"),
] as const;
