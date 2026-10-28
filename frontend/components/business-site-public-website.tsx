import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import { createPublicAppointmentRequest } from "@/app/saas-actions";
import type { PublicCompany } from "@/app/b/[slug]/page";
import { PublicAppointmentSlotFields } from "@/components/public-appointment-slot-fields";
import { PublicCatalogShowcase } from "@/components/public-catalog-showcase";
import { BusinessSiteMobileMenu } from "@/components/business-site-mobile-menu";
import { appLocaleFormats, toAppLocale, type AppLocale } from "@/i18n/config";
import { findBusinessSiteSubcategoryPreset } from "@/lib/business-site-presets";
import { publicWebsiteCopy } from "@/lib/public-website-copy";
import { createServerSupabase } from "@/lib/supabase/server";

type SiteCopy = {
  home: string;
  services: string;
  about: string;
  contact: string;
  booking: string;
  bookingTitle: string;
  bookingBody: string;
  success: string;
  error: string;
  name: string;
  phone: string;
  interest: string;
  chooseService: string;
  note: string;
  send: string;
  date: string;
  time: string;
  contactTitle: string;
  contactFallback: string;
  request: string;
  menu: string;
};

const words: Record<AppLocale, SiteCopy> = {
  en: { home: "Home", services: "Services", about: "About", contact: "Contact", booking: "Request an appointment", bookingTitle: "Find a time that works for you.", bookingBody: "Send a request and the business confirms the final time personally.", success: "Thank you — your request was sent.", error: "Please check your details and try again.", name: "Your name", phone: "Phone number", interest: "What can we help with?", chooseService: "Choose a service", note: "A short note (optional)", send: "Send request", date: "Preferred date", time: "Preferred time", contactTitle: "Let’s talk about what you need.", contactFallback: "Contact details will be added shortly.", request: "Request a time", menu: "Open menu" },
  de: { home: "Start", services: "Leistungen", about: "Über uns", contact: "Kontakt", booking: "Termin anfragen", bookingTitle: "Finden Sie einen passenden Zeitpunkt.", bookingBody: "Senden Sie eine Anfrage. Den endgültigen Termin bestätigt der Betrieb persönlich.", success: "Vielen Dank — Ihre Anfrage wurde gesendet.", error: "Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut.", name: "Ihr Name", phone: "Telefonnummer", interest: "Wobei können wir helfen?", chooseService: "Leistung auswählen", note: "Kurze Nachricht (optional)", send: "Anfrage senden", date: "Wunschtermin", time: "Wunschzeit", contactTitle: "Sprechen wir über Ihr Anliegen.", contactFallback: "Kontaktdaten werden in Kürze ergänzt.", request: "Zeit anfragen", menu: "Menü öffnen" },
  sq: { home: "Kryefaqja", services: "Shërbimet", about: "Rreth nesh", contact: "Kontakt", booking: "Kërko termin", bookingTitle: "Gjej një orar që të përshtatet.", bookingBody: "Dërgo kërkesën dhe biznesi e konfirmon personalisht orarin përfundimtar.", success: "Faleminderit — kërkesa u dërgua.", error: "Kontrollo të dhënat dhe provo përsëri.", name: "Emri yt", phone: "Numri i telefonit", interest: "Si mund të ndihmojmë?", chooseService: "Zgjidh shërbimin", note: "Shënim i shkurtër (opsional)", send: "Dërgo kërkesën", date: "Data e preferuar", time: "Ora e preferuar", contactTitle: "Të flasim për atë që të nevojitet.", contactFallback: "Të dhënat e kontaktit do të shtohen së shpejti.", request: "Kërko orar", menu: "Hap menunë" },
  it: { home: "Home", services: "Servizi", about: "Chi siamo", contact: "Contatti", booking: "Richiedi appuntamento", bookingTitle: "Trova un orario adatto a te.", bookingBody: "Invia una richiesta: l'attività confermerà personalmente l'orario finale.", success: "Grazie — la richiesta è stata inviata.", error: "Controlla i dati e riprova.", name: "Il tuo nome", phone: "Numero di telefono", interest: "Come possiamo aiutarti?", chooseService: "Scegli un servizio", note: "Breve nota (facoltativa)", send: "Invia richiesta", date: "Data preferita", time: "Ora preferita", contactTitle: "Parliamo di ciò che ti serve.", contactFallback: "I dati di contatto saranno aggiunti a breve.", request: "Richiedi un orario", menu: "Apri menu" },
  tr: { home: "Ana sayfa", services: "Hizmetler", about: "Hakkımızda", contact: "İletişim", booking: "Randevu isteyin", bookingTitle: "Size uyan bir zaman bulun.", bookingBody: "Bir istek gönderin; işletme son saati kişisel olarak onaylar.", success: "Teşekkürler — isteğiniz gönderildi.", error: "Bilgilerinizi kontrol edip tekrar deneyin.", name: "Adınız", phone: "Telefon numarası", interest: "Nasıl yardımcı olabiliriz?", chooseService: "Bir hizmet seçin", note: "Kısa not (isteğe bağlı)", send: "İstek gönder", date: "Tercih edilen tarih", time: "Tercih edilen saat", contactTitle: "İhtiyacınız olanı konuşalım.", contactFallback: "İletişim bilgileri yakında eklenecek.", request: "Zaman isteyin", menu: "Menüyü aç" },
  pl: { home: "Start", services: "Usługi", about: "O nas", contact: "Kontakt", booking: "Poproś o termin", bookingTitle: "Znajdź dogodny dla siebie termin.", bookingBody: "Wyślij prośbę, a firma osobiście potwierdzi ostateczny termin.", success: "Dziękujemy — prośba została wysłana.", error: "Sprawdź dane i spróbuj ponownie.", name: "Twoje imię", phone: "Numer telefonu", interest: "W czym możemy pomóc?", chooseService: "Wybierz usługę", note: "Krótka wiadomość (opcjonalnie)", send: "Wyślij prośbę", date: "Preferowana data", time: "Preferowana godzina", contactTitle: "Porozmawiajmy o Twoich potrzebach.", contactFallback: "Dane kontaktowe zostaną wkrótce dodane.", request: "Poproś o termin", menu: "Otwórz menu" },
};

const fallbackBusinessCopy: Record<
  AppLocale,
  {
    services: [string, string, string];
    heroStudio: string;
    heroClarity: string;
    heroForge: string;
    aboutTitle: string;
    aboutBody: string;
    highlights: [string, string];
    servicesTitle: string;
    description: string;
  }
> = {
  en: { services: ["Personal service", "Clear communication", "Made around you"], heroStudio: "Considered details", heroClarity: "Clear from the first visit", heroForge: "Built on trust", aboutTitle: "Service with a human point of view.", aboutBody: "We focus on careful work, a straightforward experience and a result you can trust.", highlights: ["Personal attention", "Clear next steps"], servicesTitle: "What we do, made simple.", description: "A local business with a personal approach and clear communication." },
  de: { services: ["Persönlicher Service", "Klare Kommunikation", "Für Sie gemacht"], heroStudio: "Liebe zum Detail", heroClarity: "Klar ab dem ersten Besuch", heroForge: "Auf Vertrauen gebaut", aboutTitle: "Service mit persönlicher Perspektive.", aboutBody: "Wir stehen für sorgfältige Arbeit, einen unkomplizierten Ablauf und Ergebnisse, auf die Sie vertrauen können.", highlights: ["Persönliche Beratung", "Klare nächste Schritte"], servicesTitle: "Unsere Leistungen, einfach erklärt.", description: "Ein lokales Unternehmen mit persönlichem Service und klarer Kommunikation." },
  sq: { services: ["Shërbim personal", "Komunikim i qartë", "Krijuar për ty"], heroStudio: "Vëmendje në detaje", heroClarity: "Qartësi që në vizitën e parë", heroForge: "Ndërtuar mbi besim", aboutTitle: "Shërbim me këndvështrim njerëzor.", aboutBody: "Fokusohemi te puna e kujdesshme, një përvojë e thjeshtë dhe një rezultat të cilit mund t'i besosh.", highlights: ["Vëmendje personale", "Hapa të qartë"], servicesTitle: "Çfarë bëjmë, thjesht.", description: "Një biznes lokal me qasje personale dhe komunikim të qartë." },
  it: { services: ["Servizio personale", "Comunicazione chiara", "Pensato per te"], heroStudio: "Cura dei dettagli", heroClarity: "Chiarezza dal primo incontro", heroForge: "Costruito sulla fiducia", aboutTitle: "Un servizio con un punto di vista umano.", aboutBody: "Ci concentriamo su un lavoro accurato, un'esperienza semplice e un risultato di cui fidarsi.", highlights: ["Attenzione personale", "Prossimi passi chiari"], servicesTitle: "Cosa facciamo, in modo semplice.", description: "Un'attività locale con un approccio personale e una comunicazione chiara." },
  tr: { services: ["Kişisel hizmet", "Açık iletişim", "Size özel"], heroStudio: "Özenli ayrıntılar", heroClarity: "İlk ziyaretten itibaren net", heroForge: "Güven üzerine kurulu", aboutTitle: "İnsani bir bakış açısıyla hizmet.", aboutBody: "Özenli iş, kolay bir deneyim ve güvenebileceğiniz bir sonuç için çalışıyoruz.", highlights: ["Kişisel ilgi", "Açık sonraki adımlar"], servicesTitle: "Yaptıklarımız, sade biçimde.", description: "Kişisel yaklaşımı ve açık iletişimi olan yerel bir işletme." },
  pl: { services: ["Osobista obsługa", "Jasna komunikacja", "Dopasowane do Ciebie"], heroStudio: "Dbałość o szczegóły", heroClarity: "Jasno od pierwszej wizyty", heroForge: "Zbudowane na zaufaniu", aboutTitle: "Usługa z ludzkim podejściem.", aboutBody: "Stawiamy na staranną pracę, prostą obsługę i rezultat, któremu możesz zaufać.", highlights: ["Osobista uwaga", "Jasne kolejne kroki"], servicesTitle: "Co robimy, prosto wyjaśnione.", description: "Lokalna firma z osobistym podejściem i jasną komunikacją." },
};

const hairStarterCopy: Record<
  AppLocale,
  {
    description: string;
    hero_eyebrow: string;
    hero_title: string;
    hero_subtitle: string;
    about_title: string;
    about_body: string;
    services_title: string;
    service_one_title: string;
    service_one_description: string;
    service_two_title: string;
    service_two_description: string;
    service_three_title: string;
    service_three_description: string;
    contact_title: string;
    contact_body: string;
  }
> = {
  en: { description: "Individual cuts, colour and styling in a relaxed studio atmosphere.", hero_eyebrow: "Hair & Beauty Studio", hero_title: "Hair that feels like you.", hero_subtitle: "Personal consultation, careful technique and a look that fits you.", about_title: "Beauty with an eye for detail.", about_body: "We take time for honest consultation, careful work and a relaxed visit to the studio.", services_title: "For your personal look", service_one_title: "Cut & styling", service_one_description: "A cut that works in daily life and feels right for you.", service_two_title: "Colour & highlights", service_two_description: "Dimension, shine and colour with a natural expression.", service_three_title: "Care & finish", service_three_description: "Care that strengthens your hair and a finish with character.", contact_title: "Request your appointment", contact_body: "Send us your preferred time. We will confirm the best appointment personally." },
  de: { description: "Individuelle Haarschnitte, Farbe und Styling in entspannter Atmosphäre.", hero_eyebrow: "Hair & Beauty Studio", hero_title: "Haare, die sich nach Ihnen anfühlen.", hero_subtitle: "Individuelle Beratung, sorgfältige Technik und ein Look, der zu Ihnen passt.", about_title: "Schönheit mit Blick fürs Detail.", about_body: "Wir nehmen uns Zeit für ehrliche Beratung, sorgfältige Arbeit und einen entspannten Besuch im Studio.", services_title: "Für Ihren persönlichen Look", service_one_title: "Schnitt & Styling", service_one_description: "Ein Schnitt, der im Alltag funktioniert und zu Ihnen passt.", service_two_title: "Farbe & Highlights", service_two_description: "Dimension, Glanz und eine Farbe mit natürlichem Ausdruck.", service_three_title: "Pflege & Finish", service_three_description: "Pflege, die Ihr Haar stärkt, und ein Finish mit Haltung.", contact_title: "Ihren Termin anfragen", contact_body: "Senden Sie uns Ihren Wunschtermin. Wir bestätigen den passenden Zeitpunkt persönlich." },
  sq: { description: "Prerje, ngjyrë dhe styling individual në një atmosferë të qetë studioje.", hero_eyebrow: "Studio flokësh & beauty", hero_title: "Flokë që ndihen si ti.", hero_subtitle: "Këshillim personal, teknikë e kujdesshme dhe një look që të përshtatet.", about_title: "Bukuri me vëmendje në detaje.", about_body: "Marrim kohë për këshillim të sinqertë, punë të kujdesshme dhe një vizitë të qetë në studio.", services_title: "Për look-un tënd personal", service_one_title: "Prerje & styling", service_one_description: "Një prerje që funksionon çdo ditë dhe të përshtatet.", service_two_title: "Ngjyrë & highlights", service_two_description: "Dimension, shkëlqim dhe ngjyrë me pamje natyrale.", service_three_title: "Kujdes & finish", service_three_description: "Kujdes që forcon flokun dhe finish me karakter.", contact_title: "Kërko termin tënd", contact_body: "Na dërgo orarin e preferuar. Ne e konfirmojmë personalisht termin më të përshtatshëm." },
  it: { description: "Tagli, colore e styling personalizzati in un'atmosfera rilassata.", hero_eyebrow: "Hair & Beauty Studio", hero_title: "Capelli che ti somigliano.", hero_subtitle: "Consulenza personale, tecnica accurata e un look che ti valorizza.", about_title: "Bellezza con attenzione ai dettagli.", about_body: "Ci prendiamo il tempo per una consulenza sincera, un lavoro accurato e una visita rilassata in studio.", services_title: "Per il tuo look personale", service_one_title: "Taglio & styling", service_one_description: "Un taglio che funziona ogni giorno e rispecchia il tuo stile.", service_two_title: "Colore & highlights", service_two_description: "Dimensione, luminosità e colore dall'effetto naturale.", service_three_title: "Cura & finish", service_three_description: "Cura che rinforza i capelli e un finish pieno di carattere.", contact_title: "Richiedi il tuo appuntamento", contact_body: "Inviaci l'orario che preferisci. Confermeremo personalmente l'appuntamento migliore." },
  tr: { description: "Rahat bir stüdyo atmosferinde kişiye özel kesim, renk ve şekillendirme.", hero_eyebrow: "Hair & Beauty Studio", hero_title: "Size kendiniz gibi hissettiren saçlar.", hero_subtitle: "Kişisel danışmanlık, özenli teknik ve size uygun bir görünüm.", about_title: "Detaylara önem veren güzellik.", about_body: "Dürüst danışmanlık, özenli çalışma ve stüdyoda rahat bir ziyaret için zaman ayırıyoruz.", services_title: "Kişisel görünümünüz için", service_one_title: "Kesim & şekillendirme", service_one_description: "Günlük hayatta da çalışan ve size yakışan bir kesim.", service_two_title: "Renk & ışıltılar", service_two_description: "Doğal ifadeli boyut, parlaklık ve renk.", service_three_title: "Bakım & bitiş", service_three_description: "Saçınızı güçlendiren bakım ve karakterli bir bitiş.", contact_title: "Randevunuzu isteyin", contact_body: "Tercih ettiğiniz zamanı gönderin. En uygun randevuyu kişisel olarak onaylayacağız." },
  pl: { description: "Indywidualne strzyżenie, kolor i stylizacja w spokojnej atmosferze studia.", hero_eyebrow: "Hair & Beauty Studio", hero_title: "Włosy, które czują się jak Ty.", hero_subtitle: "Osobista konsultacja, staranna technika i wygląd, który do Ciebie pasuje.", about_title: "Piękno z dbałością o szczegóły.", about_body: "Poświęcamy czas na szczerą konsultację, staranną pracę i spokojną wizytę w studio.", services_title: "Dla Twojego osobistego looku", service_one_title: "Strzyżenie & stylizacja", service_one_description: "Strzyżenie, które sprawdza się na co dzień i pasuje do Ciebie.", service_two_title: "Kolor & refleksy", service_two_description: "Wymiar, blask i kolor o naturalnym wyrazie.", service_three_title: "Pielęgnacja & wykończenie", service_three_description: "Pielęgnacja wzmacniająca włosy i wykończenie z charakterem.", contact_title: "Poproś o wizytę", contact_body: "Wyślij preferowany termin. Osobiście potwierdzimy najlepszą godzinę." },
};

function templateFor(company: PublicCompany) {
  if (company.theme_preset === "studio" || company.theme_preset === "clarity" || company.theme_preset === "forge") return company.theme_preset;
  if (company.industry_key === "hair_beauty") return "studio" as const;
  if (company.industry_key === "construction") return "forge" as const;
  return "clarity" as const;
}

const hairTemplateImages = {
  studio: "/images/templates/businesssite-hair-editorial-v1.png",
  clarity: "/images/templates/businesssite-hair-lumen-v1.png",
  forge: "/images/templates/businesssite-hair-noir-v1.png",
} as const;

function TikTokIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}><path d="M19.59 6.69A4.83 4.83 0 0 1 16.3 3.5h-3.08v12.57a2.89 2.89 0 1 1-2-2.75V10.2a6.03 6.03 0 1 0 5.08 5.96V9.78a7.87 7.87 0 0 0 4.61 1.48V8.18a4.84 4.84 0 0 1-1.32-1.49Z" /></svg>;
}

export async function BusinessSitePublicWebsite({ company, appointment }: { company: PublicCompany; appointment?: string }) {
  const locale = toAppLocale(company.website_locale);
  const t = words[locale];
  const fallback = fallbackBusinessCopy[locale];
  const template = templateFor(company);
  const isStudio = template === "studio";
  const isForge = template === "forge";
  const preset = findBusinessSiteSubcategoryPreset(company.industry_subcategory_key ?? "");
  const isNoir = preset?.layout === "noir";
  const isPlayful = preset?.layout === "playful" || preset?.layout === "fresh";
  const isPrecision = preset?.layout === "precision" || preset?.layout === "clinical";
  const isRitual = preset?.layout === "ritual" || preset?.layout === "sanctuary";
  const isGrounded = preset?.layout === "grounded";
  const isHuman = preset?.layout === "human";
  const isCounsel = preset?.layout === "counsel";
  const isLedger = preset?.layout === "ledger";
  const isAssured = preset?.layout === "assured";
  const isSignal = preset?.layout === "signal";
  const isAtelier = preset?.layout === "atelier";
  const isSpritz = preset?.layout === "spritz";
  const isCare = preset?.layout === "care";
  const isField = preset?.layout === "field";
  const isRestore = preset?.layout === "restore";
  const isHomelight = preset?.layout === "homelight";
  const isAfterhours = preset?.layout === "afterhours";
  const isCrystal = preset?.layout === "crystal";
  const isSystem = preset?.layout === "system";
  const isRapid = preset?.layout === "rapid";
  const isVoltage = preset?.layout === "voltage";
  const isFlow = preset?.layout === "flow";
  const isCraft = preset?.layout === "craft";
  const isSprint = preset?.layout === "sprint";
  const isRoute = preset?.layout === "route";
  const isCarry = preset?.layout === "carry";
  const isMeadow = preset?.layout === "meadow";
  const isTerrain = preset?.layout === "terrain";
  const isCanopy = preset?.layout === "canopy";
  const isWaterline = preset?.layout === "waterline";
  const heroImage = company.hero_image_url || preset?.heroImage || hairTemplateImages[template];
  const usesHairStarter =
    company.industry_key === "hair_beauty" &&
    (!company.hero_title ||
      Object.values(hairStarterCopy).some(
        (starter) => starter.hero_title === company.hero_title,
      ) ||
      (company.hero_title &&
        [
        "Mirembajtje e besueshme per automjetin tuaj",
        "Mirembajtje e besueshme për automjetin tuaj",
        ].includes(company.hero_title)));
  const content = usesHairStarter
    ? { ...company, ...hairStarterCopy[locale] }
    : company;
  const baseColors = isStudio
    ? { page: "#fbf7f2", ink: "#201916", muted: "#745f54", primary: "#31231f", accent: "#c66a43", card: "#fffdf9" }
    : isForge
      ? { page: "#181b1c", ink: "#f6f2e9", muted: "#bbc1b7", primary: "#252a2b", accent: "#d6a34a", card: "#222728" }
      : { page: "#f7fafb", ink: "#132632", muted: "#5c6f78", primary: "#173a4a", accent: "#2c8c91", card: "#ffffff" };
  const colors = preset
    ? {
        page: company.background_color || preset.theme.backgroundColor,
        ink: company.text_color || preset.theme.textColor,
        muted: isNoir ? "#BDB3A6" : preset.layout === "fresh" ? "#5F6F68" : isPlayful || isSpritz || isSprint ? "#6E6780" : isPrecision || isLedger || isCare || isAfterhours || isCrystal || isVoltage || isRoute || isWaterline ? "#5B7078" : isRitual || isGrounded || isHuman || isAssured || isRestore || isHomelight || isFlow || isCraft || isCarry || isMeadow || isCanopy ? "#667064" : isCounsel || isRapid ? "#735E63" : isSignal || isField ? "#59647B" : isAtelier || isSystem || isTerrain ? "#68645D" : "#745F54",
        primary: company.primary_color || preset.theme.primaryColor,
        accent: company.accent_color || preset.theme.accentColor,
        card: company.surface_color || preset.theme.surfaceColor,
      }
    : baseColors;
  const effectiveRadius = company.button_radius || preset?.theme.buttonRadius;
  const radius = effectiveRadius === "sharp" ? "0" : effectiveRadius === "rounded" ? "999px" : isForge ? "8px" : "20px";
  const surfaceRadius = effectiveRadius === "sharp" ? "0" : effectiveRadius === "rounded" ? "32px" : isForge ? "8px" : "20px";
  const services = [
    [content.service_one_title, content.service_one_description],
    [content.service_two_title, content.service_two_description],
    [content.service_three_title, content.service_three_description],
  ].map(([title, body], index) => ({ title: title || fallback.services[index], body: body || content.description || "" }));
  const supabase = await createServerSupabase();
  const today = new Date();
  const until = new Date();
  until.setDate(until.getDate() + 90);
  const [{ data: extraGallery }, { data: catalogItems }, { data: bookedSlots }, { data: businessHours }] = await Promise.all([
    supabase.from("gallery_images").select("image_url").eq("company_id", company.company_id).order("created_at", { ascending: false }).limit(24),
    supabase.from("company_catalog_items").select("id, item_type, name, description, price, original_price, is_featured, currency, image_url, duration_minutes").eq("company_id", company.company_id).order("is_featured", { ascending: false }).order("created_at", { ascending: false }),
    company.has_appointments
      ? supabase.rpc("list_public_appointment_slots", { input_company_id: company.company_id, input_from: today.toISOString().slice(0, 10), input_to: until.toISOString().slice(0, 10) })
      : Promise.resolve({ data: [] }),
    company.has_appointments
      ? supabase.rpc("get_public_appointment_business_hours", { input_company_id: company.company_id })
      : Promise.resolve({ data: [] }),
  ]);
  const gallery = Array.from(new Set([
    company.gallery_one_image_url,
    company.gallery_two_image_url,
    company.gallery_three_image_url,
    ...(extraGallery ?? []).map((image) => image.image_url),
  ].filter((image): image is string => Boolean(image))));
  const bookableServices = (catalogItems ?? [])
    .filter((item) => item.item_type === "service" && item.name.trim())
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
      durationMinutes: item.duration_minutes ?? 60,
      priceLabel: new Intl.NumberFormat(appLocaleFormats[locale], {
        style: "currency",
        currency: item.currency,
        maximumFractionDigits: 2,
      }).format(Number(item.price)),
    }));
  const sharedCopy = publicWebsiteCopy[locale];
  const phoneHref = company.phone ? `tel:${company.phone.replace(/\s/g, "")}` : undefined;
  const whatsappHref = company.whatsapp ? `https://wa.me/${company.whatsapp.replace(/[^\d]/g, "")}` : undefined;
  const className = (company.font_style || preset?.theme.fontStyle) === "serif" ? "font-serif" : "font-sans";
  const heroGridClass = isNoir
    ? "lg:grid-cols-[.72fr_1.28fr] lg:items-center"
    : isPlayful
      ? "lg:grid-cols-[.9fr_1.1fr] lg:items-center"
      : isPrecision
        ? "lg:grid-cols-2 lg:items-stretch"
        : isRitual
          ? "lg:grid-cols-[.86fr_1.14fr] lg:items-center"
          : isGrounded
            ? "lg:grid-cols-2 lg:items-center"
            : isHuman
              ? "lg:grid-cols-[.95fr_1.05fr] lg:items-center"
              : isCounsel
                ? "lg:grid-cols-[.82fr_1.18fr] lg:items-center"
                : isLedger
                  ? "lg:grid-cols-2 lg:items-stretch"
                  : isAssured
                    ? "lg:grid-cols-[.9fr_1.1fr] lg:items-center"
                    : isSignal
                      ? "lg:grid-cols-[.78fr_1.22fr] lg:items-center"
                      : isAtelier
                        ? "lg:grid-cols-[.7fr_1.3fr] lg:items-end"
                        : isSpritz
                          ? "lg:grid-cols-[.88fr_1.12fr] lg:items-center"
                          : isCare
                            ? "lg:grid-cols-2 lg:items-stretch"
                            : isField
                              ? "lg:grid-cols-[.82fr_1.18fr] lg:items-center"
                              : isRestore
                                ? "lg:grid-cols-[.95fr_1.05fr] lg:items-center"
                                : isHomelight
                                  ? "lg:grid-cols-[.92fr_1.08fr] lg:items-center"
                                  : isAfterhours
                                    ? "lg:grid-cols-[.8fr_1.2fr] lg:items-stretch"
                                    : isCrystal
                                      ? "lg:grid-cols-[.75fr_1.25fr] lg:items-center"
                                      : isSystem
                                        ? "lg:grid-cols-2 lg:items-stretch"
                                        : isRapid
                                          ? "lg:grid-cols-[.76fr_1.24fr] lg:items-center"
                                          : isVoltage
                                            ? "lg:grid-cols-2 lg:items-stretch"
                                            : isFlow
                                              ? "lg:grid-cols-[.88fr_1.12fr] lg:items-center"
                                              : isCraft
                                                ? "lg:grid-cols-[.94fr_1.06fr] lg:items-center"
                                                : isSprint
                                                  ? "lg:grid-cols-[.86fr_1.14fr] lg:items-center"
                                                  : isRoute
                                                    ? "lg:grid-cols-[.72fr_1.28fr] lg:items-stretch"
                                                    : isCarry
                                                      ? "lg:grid-cols-[.9fr_1.1fr] lg:items-center"
                                                      : isMeadow
                                                        ? "lg:grid-cols-[.88fr_1.12fr] lg:items-center"
                                                        : isTerrain
                                                          ? "lg:grid-cols-[.68fr_1.32fr] lg:items-end"
                                                          : isCanopy
                                                            ? "lg:grid-cols-[.8fr_1.2fr] lg:items-center"
                                                            : isWaterline
                                                              ? "lg:grid-cols-2 lg:items-stretch"
              : "lg:grid-cols-[1.15fr_.85fr] lg:items-end";
  const heroFrameClass = isNoir
    ? "min-h-[520px] border-l-8"
    : isPlayful
      ? "min-h-[430px] rounded-[3rem] lg:rotate-[1.5deg]"
      : isPrecision
        ? "min-h-[480px] border"
        : isRitual
          ? "min-h-[500px] rounded-t-[12rem] rounded-b-[2rem]"
          : isGrounded
            ? "min-h-[470px] rounded-[1rem_8rem_1rem_1rem]"
            : isHuman
              ? "min-h-[470px] rounded-[7rem_1rem_7rem_1rem]"
              : isCounsel
                ? "min-h-[520px] border-b-8"
                : isLedger
                  ? "min-h-[470px] rounded-xl border"
                  : isAssured
                    ? "min-h-[470px] rounded-[4rem_1rem_4rem_1rem]"
                    : isSignal
                      ? "min-h-[480px] rounded-[1rem_5rem_1rem_5rem]"
                      : isAtelier
                        ? "min-h-[540px] border-l"
                        : isSpritz
                          ? "min-h-[470px] rounded-[5rem_1.5rem_5rem_1.5rem]"
                          : isCare
                            ? "min-h-[480px] rounded-[2rem] border-4"
                            : isField
                              ? "min-h-[480px] rounded-[8rem_1rem_1rem_1rem]"
                              : isRestore
                                ? "min-h-[480px] rounded-[1rem_7rem_1rem_7rem]"
                                : isHomelight
                                  ? "min-h-[470px] rounded-[6rem_1.5rem_1.5rem_1.5rem]"
                                  : isAfterhours
                                    ? "min-h-[500px] border-y"
                                    : isCrystal
                                      ? "min-h-[500px] rounded-[1rem_9rem_1rem_1rem] border"
                                      : isSystem
                                        ? "min-h-[500px] border-l-8"
                                        : isRapid
                                          ? "min-h-[500px] border-b-8"
                                          : isVoltage
                                            ? "min-h-[500px] border-2"
                                            : isFlow
                                              ? "min-h-[490px] rounded-[1rem_6rem_1rem_1rem]"
                                              : isCraft
                                                ? "min-h-[470px] rounded-[6rem_1rem_6rem_1rem]"
                                                : isSprint
                                                  ? "min-h-[470px] rounded-[7rem_1rem_1rem_1rem]"
                                                  : isRoute
                                                    ? "min-h-[500px] border-y-4"
                                                    : isCarry
                                                      ? "min-h-[490px] rounded-[1rem_6rem_1rem_6rem]"
                                                      : isMeadow
                                                        ? "min-h-[480px] rounded-[8rem_1rem_8rem_1rem]"
                                                        : isTerrain
                                                          ? "min-h-[540px] border-l-8"
                                                          : isCanopy
                                                            ? "min-h-[510px] rounded-[10rem_1rem_1rem_1rem]"
                                                            : isWaterline
                                                              ? "min-h-[500px] rounded-[1rem] border-2"
              : "min-h-[420px] rounded-[2rem]";
  const serviceCardClass = isNoir
    ? "border-t-2 px-0 py-7"
    : isPlayful
      ? "border p-7 even:md:-translate-y-4"
      : isPrecision
        ? "border-l-2 p-7"
        : isRitual
          ? "border p-7"
          : isCounsel
            ? "border-t-2 px-0 py-7"
            : isLedger
              ? "border-l-2 p-7"
              : isAssured
                ? "rounded-[2rem] border p-7"
                : isSignal
                  ? "border p-7 even:md:-translate-y-3"
                  : isAtelier
                    ? "border-b p-7"
                    : isSpritz
                      ? "rounded-[2.5rem] border p-7 even:md:-translate-y-3"
                      : isCare
                        ? "border-l-4 p-7"
                        : isField
                          ? "border p-7 even:md:translate-y-3"
                          : isRestore
                            ? "rounded-[2rem] border p-7"
                            : isHomelight
                              ? "rounded-[2rem] border p-7"
                              : isAfterhours
                                ? "border-t-2 px-0 py-7"
                                : isCrystal
                                  ? "border-l-4 p-7"
                                  : isSystem
                                    ? "border p-7"
                                    : isRapid
                                      ? "border-t-2 px-0 py-7"
                                      : isVoltage
                                        ? "border-l-4 p-7"
                                        : isFlow
                                          ? "border p-7"
                                          : isCraft
                                            ? "rounded-[2rem] border p-7"
                                            : isSprint
                                              ? "rounded-[2rem] border p-7 even:md:-translate-y-3"
                                              : isRoute
                                                ? "border-l-4 p-7"
                                                : isCarry
                                                  ? "border p-7"
                                                  : isMeadow
                                                    ? "rounded-[2.5rem] border p-7 even:md:-translate-y-3"
                                                    : isTerrain
                                                      ? "border-b-2 px-0 py-7"
                                                      : isCanopy
                                                        ? "border-l-4 p-7"
                                                        : isWaterline
                                                          ? "rounded-[1.5rem] border p-7"
          : "border p-6";

  return <main className={`min-h-screen ${className} business-site-${preset?.layout ?? template}`} style={{ background: colors.page, color: colors.ink }}>
    <header className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ borderColor: `${colors.ink}18`, background: `${colors.page}ed` }}><div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 sm:px-8"><a href="#top" className="flex min-w-0 items-center gap-3">{company.logo_url ? <img src={company.logo_url} alt={`${company.display_name} logo`} className="h-10 w-auto max-w-32 shrink-0 object-contain object-left" /> : <span className="grid h-10 w-10 shrink-0 place-items-center text-sm font-black" style={{ background: colors.primary, color: colors.accent, borderRadius: radius }}>{company.display_name.slice(0, 1).toUpperCase()}</span>}<span className="truncate text-base font-bold tracking-tight">{company.display_name}</span></a><nav className="hidden items-center gap-5 text-sm font-semibold lg:flex"><a href="#services">{t.services}</a><a href="#about">{t.about}</a>{gallery.length ? <a href="#gallery">{sharedCopy.gallery}</a> : null}{catalogItems?.length ? <a href="#catalog">{sharedCopy.catalogEyebrow}</a> : null}<a href="#contact">{t.contact}</a></nav><div className="flex shrink-0 items-center gap-2">{company.has_appointments ? <a href="#booking" className="hidden items-center gap-2 px-4 py-2.5 text-sm font-bold sm:inline-flex" style={{ background: colors.primary, color: "#fff", borderRadius: radius }}>{t.request}<ArrowRight className="h-4 w-4" /></a> : null}<BusinessSiteMobileMenu label={t.menu} borderColor={`${colors.ink}20`} background={colors.card} radius={radius} items={[{ href: "#services", label: t.services }, { href: "#about", label: t.about }, ...(gallery.length ? [{ href: "#gallery" as const, label: sharedCopy.gallery }] : []), ...(catalogItems?.length ? [{ href: "#catalog" as const, label: sharedCopy.catalogEyebrow }] : []), ...(company.has_appointments ? [{ href: "#booking" as const, label: t.booking }] : []), { href: "#contact", label: t.contact }]} /></div></div></header>
    <section id="top" className={`relative overflow-hidden ${isNoir ? "border-b border-white/10" : ""}`}><div className={`mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:py-32 ${heroGridClass}`}><div className={isPrecision ? "flex flex-col justify-center border-y py-12 lg:border-r lg:px-10" : ""} style={isPrecision ? { borderColor: `${colors.ink}20` } : undefined}><p className="text-xs font-bold uppercase tracking-[.2em]" style={{ color: colors.accent }}>{content.hero_eyebrow || (isForge ? fallback.heroForge : fallback.heroClarity)}</p><h1 className={`mt-6 max-w-3xl font-bold leading-[.94] tracking-[-.055em] ${isNoir ? "text-5xl uppercase sm:text-8xl" : isPlayful ? "text-5xl sm:text-8xl" : "text-4xl sm:text-7xl"}`}>{content.hero_title || company.display_name}</h1><p className="mt-7 max-w-xl text-base leading-7 sm:text-lg sm:leading-8" style={{ color: colors.muted }}>{content.hero_subtitle || content.description || fallback.description}</p>{company.has_appointments ? <a href="#booking" className="mt-9 inline-flex items-center gap-2 px-5 py-3.5 text-sm font-bold" style={{ background: colors.accent, color: isNoir ? colors.primary : "#fff", borderRadius: radius }}><CalendarDays className="h-4 w-4" />{t.booking}</a> : null}</div><div className={`relative overflow-hidden ${heroFrameClass}`} style={{ background: colors.primary, color: "#fff", borderColor: colors.accent }}><picture><source media="(max-width: 639px)" srcSet={company.hero_mobile_image_url || heroImage} /><img src={heroImage} alt={`${company.display_name} — ${content.hero_eyebrow || t.services}`} className={`absolute inset-0 h-full w-full object-cover ${isNoir ? "object-center" : isRitual ? "object-[50%_42%]" : "object-center"}`} /></picture><div className={`absolute inset-0 ${isNoir ? "bg-gradient-to-t from-black/90 via-black/15 to-transparent" : "bg-gradient-to-t from-black/75 via-black/5 to-transparent"}`} /><div className={`relative flex min-h-[430px] flex-col justify-between p-6 ${isNoir ? "sm:min-h-[520px]" : isPrecision || isRitual ? "sm:min-h-[500px]" : ""}`}><Sparkles className="h-7 w-7" style={{ color: colors.accent }} /><div><p className="text-sm font-bold uppercase tracking-[.15em]" style={{ color: colors.accent }}>{content.hero_eyebrow || fallback.heroStudio}</p><p className="mt-4 text-3xl font-semibold leading-tight">{content.services_title || t.services}</p><div className="mt-6 grid grid-cols-3 gap-2">{services.map((service, index) => <span key={service.title} className="h-1.5" style={{ background: index === 1 ? colors.accent : "#fff4" }} />)}</div></div></div></div></div></section>
    <section id="services" className="border-y px-5 py-20 sm:px-8" style={{ borderColor: `${colors.ink}18`, background: colors.card }}><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.2em]" style={{ color: colors.accent }}>{t.services}</p><h2 className={`mt-4 max-w-2xl text-4xl font-bold tracking-[-.04em] ${isNoir ? "uppercase sm:text-6xl" : ""}`}>{content.services_title || fallback.servicesTitle}</h2><div className={`mt-12 grid gap-5 md:grid-cols-3 ${isPlayful ? "md:pt-4" : ""}`}>{services.map((service, index) => <article key={service.title} className={serviceCardClass} style={{ borderColor: `${colors.ink}24`, borderRadius: isNoir || isPrecision ? "0" : isPlayful ? "32px" : radius, background: isNoir ? "transparent" : colors.card }}><span className="text-xs font-bold" style={{ color: colors.accent }}>0{index + 1}</span><h3 className="mt-8 text-2xl font-semibold">{service.title}</h3><p className="mt-3 text-sm leading-7" style={{ color: colors.muted }}>{service.body}</p></article>)}</div></div></section>
    <section id="about" className="mx-auto grid max-w-7xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:py-32"><p className="text-xs font-bold uppercase tracking-[.2em]" style={{ color: colors.accent }}>{t.about}</p><div><h2 className="text-4xl font-bold tracking-[-.04em]">{content.about_title || fallback.aboutTitle}</h2><p className="mt-6 max-w-2xl text-lg leading-8" style={{ color: colors.muted }}>{content.about_body || content.description || fallback.aboutBody}</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{fallback.highlights.map((item) => <span key={item} className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4" style={{ color: colors.accent }} />{item}</span>)}</div></div></section>
    {gallery.length ? <section id="gallery" className="border-y px-5 py-20 sm:px-8 lg:py-28" style={{ borderColor: `${colors.ink}18`, background: colors.card }}><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.2em]" style={{ color: colors.accent }}>{sharedCopy.galleryEyebrow}</p><h2 className="mt-4 max-w-2xl text-4xl font-bold tracking-[-.04em]">{content.gallery_title || sharedCopy.galleryTitle}</h2>{content.gallery_subtitle ? <p className="mt-4 max-w-2xl leading-7" style={{ color: colors.muted }}>{content.gallery_subtitle}</p> : null}<div className="mt-10 grid auto-rows-[220px] gap-4 sm:grid-cols-2 lg:grid-cols-3">{gallery.map((image, index) => <figure key={image} className={`relative overflow-hidden ${index === 0 ? "sm:row-span-2 lg:col-span-2" : ""}`} style={{ borderRadius: surfaceRadius, background: `${colors.primary}14` }}><img src={image} alt={`${content.gallery_title || sharedCopy.galleryAlt} — ${company.display_name} ${index + 1}`} loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-[1.02]" /></figure>)}</div></div></section> : null}
    {catalogItems?.length ? <section id="catalog" className="px-5 py-20 sm:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.2em]" style={{ color: colors.accent }}>{sharedCopy.catalogEyebrow}</p><h2 className="mt-4 max-w-2xl text-4xl font-bold tracking-[-.04em]">{sharedCopy.catalogTitle}</h2><p className="mt-4 max-w-2xl leading-7" style={{ color: colors.muted }}>{sharedCopy.catalogBody}</p><PublicCatalogShowcase items={catalogItems} locale={appLocaleFormats[locale]} textColor={colors.ink} surfaceColor={colors.card} accentColor={colors.accent} radius={surfaceRadius} serviceLabel={sharedCopy.service} productLabel={sharedCopy.product} /></div></section> : null}
    {company.has_appointments ? <section id="booking" className="px-5 py-20 sm:px-8" style={{ background: colors.primary, color: "#fff" }}><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><Clock3 className="h-7 w-7" style={{ color: colors.accent }} /><h2 className="mt-6 text-4xl font-bold tracking-[-.04em]">{t.bookingTitle}</h2><p className="mt-5 max-w-md leading-7 text-white/70">{t.bookingBody}</p>{appointment === "sent" ? <p className="mt-6 border border-emerald-200/30 bg-emerald-200/10 p-4 text-sm font-bold text-emerald-50">{t.success}</p> : null}{appointment && appointment !== "sent" ? <p className="mt-6 border border-rose-200/30 bg-rose-200/10 p-4 text-sm font-bold text-rose-50">{t.error}</p> : null}</div><form action={createPublicAppointmentRequest} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-8" style={{ background: "#ffffff12", border: "1px solid #ffffff24", borderRadius: surfaceRadius }}><input type="hidden" name="companyId" value={company.company_id} /><input type="hidden" name="slug" value={company.slug} /><label className="grid gap-2 text-sm font-bold">{t.name}<input required name="customerName" maxLength={120} className="h-11 border border-white/25 bg-black/15 px-3 text-white outline-none" style={{ borderRadius: radius }} /></label><label className="grid gap-2 text-sm font-bold">{t.phone}<input required name="phone" inputMode="tel" maxLength={40} className="h-11 border border-white/25 bg-black/15 px-3 text-white outline-none" style={{ borderRadius: radius }} /></label><PublicAppointmentSlotFields serviceOptions={bookableServices} serviceLabel={t.interest} chooseServiceLabel={t.chooseService} bookedSlots={(bookedSlots ?? []) as { scheduled_date: string; scheduled_time: string; duration_minutes: number }[]} businessHours={(businessHours ?? []) as { weekday: number; is_open: boolean; opens_at: string; closes_at: string; slot_minutes: number }[]} dateLabel={t.date} timeLabel={t.time} radius={radius} dark /><label className="grid gap-2 text-sm font-bold sm:col-span-2">{t.note}<textarea name="note" maxLength={1000} rows={3} className="border border-white/25 bg-black/15 px-3 py-2 text-white outline-none" style={{ borderRadius: surfaceRadius }} /></label><button className="w-fit px-5 py-3 text-sm font-bold" style={{ background: colors.accent, color: isForge ? colors.primary : "#fff", borderRadius: radius }}>{t.send}</button></form></div></section> : null}
    <section id="contact" className="mx-auto grid max-w-7xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_.8fr]"><div><p className="text-xs font-bold uppercase tracking-[.2em]" style={{ color: colors.accent }}>{t.contact}</p><h2 className="mt-5 text-4xl font-bold tracking-[-.04em]">{content.contact_title || t.contactTitle}</h2><p className="mt-5 max-w-xl text-lg leading-8" style={{ color: colors.muted }}>{content.contact_body || t.contactFallback}</p></div><div className="space-y-5 border p-6" style={{ borderColor: `${colors.ink}18`, borderRadius: surfaceRadius }}>{company.phone ? <a className="flex items-center gap-3 font-semibold" href={phoneHref}><Phone className="h-5 w-5" style={{ color: colors.accent }} />{company.phone}</a> : null}{company.whatsapp ? <a className="flex items-center gap-3 font-semibold" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle className="h-5 w-5" style={{ color: colors.accent }} />WhatsApp</a> : null}{company.email ? <a className="flex items-center gap-3 font-semibold" href={`mailto:${company.email}`}><Mail className="h-5 w-5" style={{ color: colors.accent }} />{company.email}</a> : null}{company.address ? <p className="flex items-start gap-3 font-semibold"><MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: colors.accent }} />{[company.address, company.city, company.country].filter(Boolean).join(", ")}</p> : null}{company.instagram_url || company.facebook_url || company.tiktok_url ? <div className="flex items-center gap-2 border-t pt-5" style={{ borderColor: `${colors.ink}18` }}><span className="mr-2 text-sm font-semibold" style={{ color: colors.muted }}>Social</span>{company.instagram_url ? <a href={company.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram" className="grid h-10 w-10 place-items-center border transition hover:opacity-70" style={{ borderColor: `${colors.ink}20`, borderRadius: radius }}><Instagram className="h-4 w-4" /></a> : null}{company.facebook_url ? <a href={company.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook" className="grid h-10 w-10 place-items-center border transition hover:opacity-70" style={{ borderColor: `${colors.ink}20`, borderRadius: radius }}><Facebook className="h-4 w-4" /></a> : null}{company.tiktok_url ? <a href={company.tiktok_url} target="_blank" rel="noreferrer" aria-label="TikTok" className="grid h-10 w-10 place-items-center border transition hover:opacity-70" style={{ borderColor: `${colors.ink}20`, borderRadius: radius }}><TikTokIcon className="h-4 w-4" /></a> : null}</div> : null}</div></section>
    <footer className="border-t px-5 py-7 text-sm sm:px-8" style={{ borderColor: `${colors.ink}18`, background: colors.card, color: colors.muted }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{company.display_name}</span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2 font-semibold">{company.instagram_url ? <a href={company.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram" className="transition hover:opacity-70"><Instagram className="h-4 w-4" /></a> : null}{company.facebook_url ? <a href={company.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook" className="transition hover:opacity-70"><Facebook className="h-4 w-4" /></a> : null}{company.tiktok_url ? <a href={company.tiktok_url} target="_blank" rel="noreferrer" aria-label="TikTok" className="transition hover:opacity-70"><TikTokIcon className="h-4 w-4" /></a> : null}{company.legal_notice_url ? <a href={company.legal_notice_url} target="_blank" rel="noreferrer" className="hover:underline">{sharedCopy.legalNotice}</a> : null}{company.privacy_policy_url ? <a href={company.privacy_policy_url} target="_blank" rel="noreferrer" className="hover:underline">{sharedCopy.privacyPolicy}</a> : null}</span>
      </div>
    </footer>
  </main>;
}
