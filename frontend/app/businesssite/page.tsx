import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, Bell, CalendarDays, CheckCircle2, Clock3, Globe2, MapPin, Megaphone, Menu, Palette, Sparkles, TabletSmartphone } from "lucide-react";
import { getLocale } from "next-intl/server";
import { toAppLocale, type AppLocale } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/language-switcher";

export const metadata: Metadata = {
  title: "BusinessSite | A website that feels like your business",
  description: "Distinctive websites and booking experiences designed around local businesses—not generic templates.",
};

type Copy = {
  eyebrow: string;
  hero: string;
  intro: string;
  primary: string;
  view: string;
  identity: string;
  identityText: string;
  showcase: string;
  showcaseText: string;
  built: string;
  more: string;
  moreText: string;
  closing: string;
  closingText: string;
};

const copy: Record<AppLocale, Copy> = {
  en: {
    eyebrow: "Digital identities for local businesses",
    hero: "Your business deserves a website that feels like your business.",
    intro: "Designed around your identity, services and customers—not around a generic template.",
    primary: "See how your business could look",
    view: "View selected work",
    identity: "Your business becomes your digital identity.",
    identityText: "We bring the details that already make your business distinctive into one coherent, confident online presence.",
    showcase: "Different businesses. Different visual identities.",
    showcaseText: "Typography, layout, imagery and rhythm change with the business. The result should feel owned, never selected.",
    built: "We don't start with a template. We start with the business.",
    more: "More than a beautiful website.",
    moreText: "Every practical detail is designed into the experience, without letting functionality overpower your identity.",
    closing: "See your business online before you decide.",
    closingText: "We can prepare a private, personalised direction around your business before you commit.",
  },
  de: {
    eyebrow: "Digitale Identitäten für lokale Unternehmen",
    hero: "Ihr Unternehmen verdient eine Website, die sich wie Ihr Unternehmen anfühlt.",
    intro: "Entwickelt aus Ihrer Identität, Ihren Leistungen und Kunden – nicht aus einer generischen Vorlage.",
    primary: "Sehen Sie, wie Ihr Unternehmen wirken kann",
    view: "Ausgewählte Arbeiten",
    identity: "Ihr Unternehmen wird zu Ihrer digitalen Identität.",
    identityText: "Wir übersetzen die Details, die Ihr Unternehmen besonders machen, in einen stimmigen und selbstbewussten Auftritt.",
    showcase: "Andere Unternehmen. Andere visuelle Identitäten.",
    showcaseText: "Typografie, Layout, Bildwelt und Rhythmus folgen dem Unternehmen. Das Ergebnis wirkt eigenständig, nie ausgewählt.",
    built: "Wir beginnen nicht mit einer Vorlage. Wir beginnen mit dem Unternehmen.",
    more: "Mehr als eine schöne Website.",
    moreText: "Alle praktischen Details werden Teil des Erlebnisses, ohne die Identität zu überlagern.",
    closing: "Sehen Sie Ihr Unternehmen online, bevor Sie entscheiden.",
    closingText: "Vor Ihrer Entscheidung entwickeln wir eine private, persönliche Designrichtung für Ihr Unternehmen.",
  },
  sq: {
    eyebrow: "Identitete digjitale për biznese lokale",
    hero: "Biznesi yt meriton një website që ndihet si biznesi yt.",
    intro: "I dizajnuar rreth identitetit, shërbimeve dhe klientëve të tu—jo rreth një shablloni të zakonshëm.",
    primary: "Shiko si mund të duket biznesi yt",
    view: "Shiko punët e zgjedhura",
    identity: "Biznesi yt bëhet identiteti yt digjital.",
    identityText: "Detajet që e bëjnë biznesin tënd të veçantë i kthejmë në një prani online koherente dhe me vetëbesim.",
    showcase: "Biznese të ndryshme. Identitete vizuale të ndryshme.",
    showcaseText: "Tipografia, struktura, imazhet dhe ritmi ndryshojnë me biznesin. Rezultati ndihet i yti, jo i zgjedhur nga katalogu.",
    built: "Nuk fillojmë me një shabllon. Fillojmë me biznesin.",
    more: "Më shumë se një website i bukur.",
    moreText: "Çdo detaj praktik dizajnohet brenda përvojës, pa e lënë funksionin të mbulojë identitetin.",
    closing: "Shikoje biznesin tënd online para se të vendosësh.",
    closingText: "Mund të përgatisim një drejtim privat dhe të personalizuar para se të angazhohesh.",
  },
  it: {
    eyebrow: "Identità digitali per attività locali",
    hero: "La tua attività merita un sito che sembri davvero tuo.",
    intro: "Progettato intorno alla tua identità, ai servizi e ai clienti, non a un modello generico.",
    primary: "Scopri come potrebbe apparire la tua attività",
    view: "Progetti selezionati",
    identity: "La tua attività diventa la tua identità digitale.",
    identityText: "Trasformiamo i dettagli che rendono unica la tua attività in una presenza online coerente e sicura.",
    showcase: "Attività diverse. Identità visive diverse.",
    showcaseText: "Tipografia, layout, immagini e ritmo cambiano con l'attività. Il risultato sembra tuo, mai scelto da un catalogo.",
    built: "Non partiamo da un modello. Partiamo dall'attività.",
    more: "Più di un bel sito.",
    moreText: "Ogni dettaglio pratico entra nell'esperienza senza coprire l'identità.",
    closing: "Guarda online la tua attività prima di decidere.",
    closingText: "Possiamo preparare una direzione privata e personalizzata prima di ogni impegno.",
  },
  tr: {
    eyebrow: "Yerel işletmeler için dijital kimlikler",
    hero: "İşletmeniz, kendisi gibi hissettiren bir web sitesini hak ediyor.",
    intro: "Sıradan bir şablona göre değil; kimliğiniz, hizmetleriniz ve müşterileriniz etrafında tasarlanır.",
    primary: "İşletmenizin nasıl görünebileceğini keşfedin",
    view: "Seçili çalışmaları görün",
    identity: "İşletmeniz dijital kimliğinize dönüşür.",
    identityText: "İşletmenizi farklı kılan detayları tutarlı ve özgüvenli bir çevrim içi varlığa dönüştürüyoruz.",
    showcase: "Farklı işletmeler. Farklı görsel kimlikler.",
    showcaseText: "Tipografi, düzen, görseller ve ritim işletmeyle değişir. Sonuç katalogdan seçilmiş değil, size ait görünür.",
    built: "Bir şablonla başlamıyoruz. İşletmeyle başlıyoruz.",
    more: "Güzel bir web sitesinden fazlası.",
    moreText: "Her pratik detay, kimliği gölgede bırakmadan deneyime dahil edilir.",
    closing: "Karar vermeden önce işletmenizi çevrim içi görün.",
    closingText: "Taahhütte bulunmadan önce işletmenize özel bir tasarım yönü hazırlayabiliriz.",
  },
  pl: {
    eyebrow: "Cyfrowe tożsamości lokalnych firm",
    hero: "Twoja firma zasługuje na stronę, która naprawdę do niej pasuje.",
    intro: "Projektowaną wokół Twojej marki, usług i klientów, a nie ogólnego szablonu.",
    primary: "Zobacz, jak może wyglądać Twoja firma",
    view: "Wybrane realizacje",
    identity: "Twoja firma staje się cyfrową tożsamością.",
    identityText: "Przekładamy detale wyróżniające Twoją firmę na spójną i pewną siebie obecność online.",
    showcase: "Różne firmy. Różne tożsamości wizualne.",
    showcaseText: "Typografia, układ, obrazy i rytm zmieniają się wraz z firmą. Efekt wygląda jak własny, nie wybrany z katalogu.",
    built: "Nie zaczynamy od szablonu. Zaczynamy od firmy.",
    more: "Więcej niż piękna strona.",
    moreText: "Każdy praktyczny detal jest częścią doświadczenia i nie przesłania tożsamości.",
    closing: "Zobacz swoją firmę online, zanim zdecydujesz.",
    closingText: "Przed zobowiązaniem możemy przygotować prywatny, spersonalizowany kierunek projektu.",
  },
};

const bookingCopy: Record<AppLocale, { eyebrow: string; title: string; text: string; direct: string; request: string; app: string; confirm: string }> = {
  en: { eyebrow: "Website + online appointments", title: "Appointments arrive directly in your app.", text: "Customers choose a service, date and preferred time on your website. The request appears instantly in your BusinessSite workspace, ready for you to review and confirm.", direct: "Connected in real time", request: "Appointment request sent", app: "New online appointment", confirm: "Review & confirm" },
  de: { eyebrow: "Website + Online-Termine", title: "Terminanfragen landen direkt in Ihrer App.", text: "Kunden wählen Leistung, Datum und Wunschzeit auf Ihrer Website. Die Anfrage erscheint sofort in Ihrem BusinessSite-Arbeitsbereich und kann geprüft und bestätigt werden.", direct: "In Echtzeit verbunden", request: "Terminanfrage gesendet", app: "Neuer Online-Termin", confirm: "Prüfen & bestätigen" },
  sq: { eyebrow: "Website + termine online", title: "Terminet vijnë direkt në app-in tënd.", text: "Klienti zgjedh shërbimin, datën dhe orarin e preferuar në website. Kërkesa shfaqet menjëherë në BusinessSite, gati që ta kontrollosh dhe konfirmosh.", direct: "Të lidhura në kohë reale", request: "Kërkesa për termin u dërgua", app: "Termin i ri online", confirm: "Kontrollo & konfirmo" },
  it: { eyebrow: "Sito + appuntamenti online", title: "Gli appuntamenti arrivano direttamente nella tua app.", text: "Il cliente sceglie servizio, data e orario sul sito. La richiesta appare subito nel workspace BusinessSite, pronta da controllare e confermare.", direct: "Collegato in tempo reale", request: "Richiesta inviata", app: "Nuovo appuntamento online", confirm: "Controlla e conferma" },
  tr: { eyebrow: "Web sitesi + çevrim içi randevu", title: "Randevular doğrudan uygulamanıza gelir.", text: "Müşteriler web sitenizden hizmet, tarih ve saat seçer. Talep anında BusinessSite çalışma alanınıza gelir; inceleyip onaylayabilirsiniz.", direct: "Gerçek zamanlı bağlantı", request: "Randevu talebi gönderildi", app: "Yeni çevrim içi randevu", confirm: "İncele ve onayla" },
  pl: { eyebrow: "Strona + rezerwacje online", title: "Rezerwacje trafiają bezpośrednio do aplikacji.", text: "Klient wybiera usługę, datę i godzinę na stronie. Prośba od razu pojawia się w BusinessSite, gotowa do sprawdzenia i potwierdzenia.", direct: "Połączenie w czasie rzeczywistym", request: "Prośba wysłana", app: "Nowa rezerwacja online", confirm: "Sprawdź i potwierdź" },
};

const offerCopy: Record<AppLocale, { eyebrow: string; title: string; text: string; services: [[string, string], [string, string], [string, string]]; promises: [string, string, string] }> = {
  en: { eyebrow: "Simple by design", title: "Only what a local business actually needs.", text: "A professional website, online appointments and a clear place to promote products or offers. No heavy platform and no unnecessary modules.", services: [["Your website", "A fast, mobile-first presence with your identity, services and contact details."], ["Online appointments", "Customers request a time online and you manage every request directly in the app."], ["Products & offers", "Present selected products, prices or seasonal offers without running a full online shop."]], promises: ["No website creation fee", "Low monthly maintenance", "Cancel whenever you want"] },
  de: { eyebrow: "Bewusst einfach", title: "Nur das, was ein lokales Unternehmen wirklich braucht.", text: "Eine professionelle Website, Online-Termine und ein klarer Bereich für Produkte oder Angebote. Keine schwere Plattform und keine unnötigen Module.", services: [["Ihre Website", "Ein schneller, mobiler Auftritt mit Identität, Leistungen und Kontaktdaten."], ["Online-Termine", "Kunden fragen online einen Termin an, Sie verwalten alles direkt in der App."], ["Produkte & Angebote", "Zeigen Sie ausgewählte Produkte, Preise oder saisonale Angebote ohne kompletten Onlineshop."]], promises: ["Keine Erstellungskosten", "Geringe monatliche Wartung", "Jederzeit kündbar"] },
  sq: { eyebrow: "E thjeshtë me qëllim", title: "Vetëm ajo që i duhet vërtet një biznesi lokal.", text: "Një website profesional, termine online dhe një hapësirë e qartë për të reklamuar produkte ose oferta. Pa platformë të rëndë dhe pa module të panevojshme.", services: [["Website-i yt", "Një prani e shpejtë për telefon me identitetin, shërbimet dhe kontaktet e tua."], ["Termine online", "Klientët kërkojnë orarin online dhe ti menaxhon çdo kërkesë direkt në aplikacion."], ["Produkte & oferta", "Prezanto produkte të zgjedhura, çmime ose oferta sezonale pa hapur një dyqan online."]], promises: ["Pa kosto krijimi", "Mirëmbajtje mujore me kosto të ulët", "Mbylle kur të duash"] },
  it: { eyebrow: "Semplice per scelta", title: "Solo ciò che serve davvero a un'attività locale.", text: "Un sito professionale, appuntamenti online e uno spazio chiaro per promuovere prodotti o offerte. Nessuna piattaforma pesante e nessun modulo inutile.", services: [["Il tuo sito", "Una presenza veloce e mobile con identità, servizi e contatti."], ["Appuntamenti online", "I clienti richiedono un orario online e tu gestisci tutto direttamente nell'app."], ["Prodotti e offerte", "Presenta prodotti, prezzi o offerte stagionali senza gestire un intero negozio online."]], promises: ["Nessun costo di creazione", "Manutenzione mensile contenuta", "Annulla quando vuoi"] },
  tr: { eyebrow: "Bilinçli olarak sade", title: "Yerel bir işletmenin gerçekten ihtiyaç duyduğu şeyler.", text: "Profesyonel web sitesi, çevrim içi randevu ve ürün ya da kampanyaları tanıtmak için net bir alan. Ağır platform ve gereksiz modül yok.", services: [["Web siteniz", "Kimliğiniz, hizmetleriniz ve iletişim bilgilerinizle hızlı, mobil öncelikli bir görünüm."], ["Çevrim içi randevu", "Müşteriler çevrim içi saat ister, siz tüm talepleri doğrudan uygulamada yönetirsiniz."], ["Ürünler ve teklifler", "Tam bir mağaza kurmadan seçili ürünleri, fiyatları veya dönemsel teklifleri gösterin."]], promises: ["Web sitesi kurulum ücreti yok", "Düşük aylık bakım", "İstediğiniz zaman iptal edin"] },
  pl: { eyebrow: "Celowo proste", title: "Tylko to, czego naprawdę potrzebuje lokalna firma.", text: "Profesjonalna strona, rezerwacje online i czytelne miejsce na promocję produktów lub ofert. Bez ciężkiej platformy i zbędnych modułów.", services: [["Twoja strona", "Szybka, mobilna obecność z marką, usługami i danymi kontaktowymi."], ["Rezerwacje online", "Klienci proszą o termin online, a Ty zarządzasz wszystkim bezpośrednio w aplikacji."], ["Produkty i oferty", "Pokazuj wybrane produkty, ceny lub oferty sezonowe bez pełnego sklepu internetowego."]], promises: ["Bez opłaty za stworzenie strony", "Niski miesięczny koszt utrzymania", "Rezygnacja w dowolnym momencie"] },
};

type LocalUi = {
  nav: [string, string, string, string]; start: string; heroNote: string;
  transformation: string; identityLabels: [string, string, string, string]; selected: string;
  showcases: [{ category: string; description: string; traits: string }, { category: string; description: string; traits: string }, { category: string; description: string; traits: string; title: string }];
  pillars: [[string, string], [string, string], [string, string], [string, string]];
  previewNav: [string, string, string, string]; previewMeta: [string, string, string]; previewConsultation: string; previewHours: string; previewFast: string; chooseExperience: string; signature: string; personal: string;
  variants: { construction: [string, string, string]; professional: [string, string, string]; noir: [string, string, string]; lumen: [string, string, string] };
  bookVisit: string; selectService: string; appointments: string; newRequest: string; preferredDate: string; preferredTime: string; status: string; waiting: string; month: string; flow: string; demoEyebrow: string;
  experience: string; experienceItems: [string, string, string, string]; mobileFirst: string; responsive: string; mobileNote: string; footer: string;
};

const uiCopy: Record<AppLocale, LocalUi> = {
  en: {
    nav: ["Work", "Approach", "Online booking", "Experience"], start: "Create your website", heroNote: "Desktop, tablet and mobile. One considered identity.", transformation: "Transformation", identityLabels: ["Logo", "Photography", "Services", "Colour"], selected: "Selected identities",
    showcases: [{ category: "Beauty / Wellness", description: "Soft light, tactile colour and generous type create a calm invitation.", traits: "Warm · Sensory · Personal" }, { category: "Professional service", description: "Quiet authority, architectural spacing and information with purpose.", traits: "Clear · Assured · Human" }, { category: "Workshop / Trades", description: "Bold structure and direct proof for businesses built on trust.", traits: "Direct · Solid · Capable", title: "Built properly." }],
    pillars: [["Identity", "Your character, made visible."], ["Services", "What you do, made clear."], ["Customers", "Who you serve, understood."], ["Location", "Where trust becomes local."]],
    previewNav: ["About", "Services", "Journal", "Contact"], previewMeta: ["Service", "Visit", "Online"], previewConsultation: "Personal consultation", previewHours: "Mon—Sat", previewFast: "Book in 2 minutes", chooseExperience: "Choose your experience", signature: "Signature service", personal: "Personal consultation",
    variants: { construction: ["Spaces built to last", "Built with purpose.", "Start a project"], professional: ["Independent advisory", "Clarity for the decisions ahead.", "Book a consultation"], noir: ["Hair · form · identity", "A quieter kind of confidence.", "Reserve your visit"], lumen: ["Beauty & wellbeing", "Feel like yourself again.", "Book an appointment"] },
    bookVisit: "Book your visit", selectService: "Select a service", appointments: "Appointments", newRequest: "New request", preferredDate: "Preferred date", preferredTime: "Preferred time", status: "Status", waiting: "Waiting for confirmation", month: "SEP", flow: "Website → App", demoEyebrow: "A private first look", experience: "The experience", experienceItems: ["Booking", "Map & location", "Opening hours", "Your visual identity"], mobileFirst: "Mobile first, always", responsive: "Responsive by design", mobileNote: "Made for the screen customers use most", footer: "Identity first · Presentation · Trust · Design",
  },
  de: {
    nav: ["Projekte", "Ansatz", "Online-Termine", "Erlebnis"], start: "Website erstellen", heroNote: "Desktop, Tablet und Mobil. Eine durchdachte Identität.", transformation: "Transformation", identityLabels: ["Logo", "Fotografie", "Leistungen", "Farbe"], selected: "Ausgewählte Identitäten",
    showcases: [{ category: "Beauty / Wellness", description: "Sanftes Licht, fühlbare Farben und großzügige Typografie laden ruhig ein.", traits: "Warm · Sinnlich · Persönlich" }, { category: "Professionelle Beratung", description: "Ruhige Autorität, klare Abstände und Informationen mit Zweck.", traits: "Klar · Souverän · Menschlich" }, { category: "Handwerk", description: "Starke Struktur und direkte Belege für Unternehmen, die auf Vertrauen bauen.", traits: "Direkt · Solide · Kompetent", title: "Richtig gebaut." }],
    pillars: [["Identität", "Ihr Charakter wird sichtbar."], ["Leistungen", "Ihr Angebot wird verständlich."], ["Kunden", "Ihre Zielgruppe wird verstanden."], ["Standort", "Vertrauen wird lokal."]],
    previewNav: ["Über uns", "Leistungen", "Journal", "Kontakt"], previewMeta: ["Leistung", "Besuch", "Online"], previewConsultation: "Persönliche Beratung", previewHours: "Mo—Sa", previewFast: "In 2 Minuten buchen", chooseExperience: "Leistung wählen", signature: "Signature-Leistung", personal: "Persönliche Beratung",
    variants: { construction: ["Räume, die bleiben", "Mit Sinn gebaut.", "Projekt starten"], professional: ["Unabhängige Beratung", "Klarheit für wichtige Entscheidungen.", "Beratung buchen"], noir: ["Haar · Form · Identität", "Eine ruhige Art von Selbstvertrauen.", "Besuch reservieren"], lumen: ["Beauty & Wohlbefinden", "Wieder ganz Sie selbst.", "Termin buchen"] },
    bookVisit: "Besuch buchen", selectService: "Leistung wählen", appointments: "Termine", newRequest: "Neue Anfrage", preferredDate: "Wunschdatum", preferredTime: "Wunschzeit", status: "Status", waiting: "Wartet auf Bestätigung", month: "SEP", flow: "Website → App", demoEyebrow: "Eine private Vorschau", experience: "Das Erlebnis", experienceItems: ["Terminbuchung", "Karte & Standort", "Öffnungszeiten", "Ihre visuelle Identität"], mobileFirst: "Mobile zuerst, immer", responsive: "Responsiv gestaltet", mobileNote: "Für den Bildschirm, den Kunden am meisten nutzen", footer: "Identität zuerst · Präsentation · Vertrauen · Design",
  },
  sq: {
    nav: ["Projektet", "Qasja", "Termine online", "Përvoja"], start: "Krijo website-in", heroNote: "Desktop, tablet dhe telefon. Një identitet i menduar mirë.", transformation: "Transformimi", identityLabels: ["Logo", "Fotografi", "Shërbime", "Ngjyra"], selected: "Identitete të zgjedhura",
    showcases: [{ category: "Bukuri / Wellness", description: "Dritë e butë, ngjyra të ngrohta dhe tipografi e lirshme krijojnë një ftesë të qetë.", traits: "E ngrohtë · Ndjesore · Personale" }, { category: "Shërbime profesionale", description: "Autoritet i qetë, hapësirë arkitekturore dhe informacion me qëllim.", traits: "E qartë · E sigurt · Njerëzore" }, { category: "Zanate / Punëtori", description: "Strukturë e fortë dhe prova direkte për biznese të ndërtuara mbi besimin.", traits: "Direkte · Solide · E aftë", title: "Ndërtuar siç duhet." }],
    pillars: [["Identiteti", "Karakteri yt bëhet i dukshëm."], ["Shërbimet", "Ajo që ofron bëhet e qartë."], ["Klientët", "Kuptojmë kë i shërben."], ["Vendndodhja", "Besimi bëhet lokal."]],
    previewNav: ["Rreth nesh", "Shërbimet", "Revista", "Kontakti"], previewMeta: ["Shërbimi", "Vizita", "Online"], previewConsultation: "Konsultë personale", previewHours: "Hën—Sht", previewFast: "Rezervo në 2 minuta", chooseExperience: "Zgjidh përvojën", signature: "Shërbimi special", personal: "Konsultë personale",
    variants: { construction: ["Hapësira që zgjasin", "Ndërtuar me qëllim.", "Fillo projektin"], professional: ["Këshillim i pavarur", "Qartësi për vendimet që vijnë.", "Rezervo konsultë"], noir: ["Flokë · formë · identitet", "Një vetëbesim më i qetë.", "Rezervo vizitën"], lumen: ["Bukuri & mirëqenie", "Ndihu përsëri vetvetja.", "Rezervo termin"] },
    bookVisit: "Rezervo vizitën", selectService: "Zgjidh shërbimin", appointments: "Terminet", newRequest: "Kërkesë e re", preferredDate: "Data e preferuar", preferredTime: "Ora e preferuar", status: "Statusi", waiting: "Në pritje të konfirmimit", month: "SHT", flow: "Website → Aplikacion", demoEyebrow: "Një pamje private paraprake", experience: "Përvoja", experienceItems: ["Rezervimi", "Harta & vendndodhja", "Orari i punës", "Identiteti yt vizual"], mobileFirst: "Telefoni në plan të parë", responsive: "Dizajn responsive", mobileNote: "Krijuar për ekranin që klientët përdorin më shumë", footer: "Identitet · Prezantim · Besim · Dizajn",
  },
  it: {
    nav: ["Progetti", "Metodo", "Appuntamenti online", "Esperienza"], start: "Crea il tuo sito", heroNote: "Desktop, tablet e mobile. Un'unica identità curata.", transformation: "Trasformazione", identityLabels: ["Logo", "Fotografia", "Servizi", "Colore"], selected: "Identità selezionate",
    showcases: [{ category: "Beauty / Benessere", description: "Luce morbida, colore materico e tipografia ariosa creano un invito calmo.", traits: "Caldo · Sensoriale · Personale" }, { category: "Servizi professionali", description: "Autorevolezza discreta, spazi architettonici e informazioni mirate.", traits: "Chiaro · Sicuro · Umano" }, { category: "Artigianato", description: "Struttura forte e prove concrete per attività fondate sulla fiducia.", traits: "Diretto · Solido · Capace", title: "Costruito bene." }],
    pillars: [["Identità", "Il tuo carattere diventa visibile."], ["Servizi", "Ciò che fai diventa chiaro."], ["Clienti", "Comprendiamo chi servi."], ["Luogo", "La fiducia diventa locale."]], previewNav: ["Chi siamo", "Servizi", "Magazine", "Contatti"], previewMeta: ["Servizio", "Visita", "Online"], previewConsultation: "Consulenza personale", previewHours: "Lun—Sab", previewFast: "Prenota in 2 minuti", chooseExperience: "Scegli l'esperienza", signature: "Servizio signature", personal: "Consulenza personale", variants: { construction: ["Spazi fatti per durare", "Costruito con uno scopo.", "Avvia un progetto"], professional: ["Consulenza indipendente", "Chiarezza per le prossime decisioni.", "Prenota consulenza"], noir: ["Capelli · forma · identità", "Una sicurezza più discreta.", "Prenota la visita"], lumen: ["Bellezza & benessere", "Torna a sentirti te stessa.", "Prenota appuntamento"] }, bookVisit: "Prenota la visita", selectService: "Scegli il servizio", appointments: "Appuntamenti", newRequest: "Nuova richiesta", preferredDate: "Data preferita", preferredTime: "Ora preferita", status: "Stato", waiting: "In attesa di conferma", month: "SET", flow: "Sito → App", demoEyebrow: "Un'anteprima privata", experience: "L'esperienza", experienceItems: ["Prenotazione", "Mappa e posizione", "Orari", "La tua identità visiva"], mobileFirst: "Mobile prima di tutto", responsive: "Responsive per natura", mobileNote: "Creato per lo schermo più usato dai clienti", footer: "Identità · Presentazione · Fiducia · Design",
  },
  tr: {
    nav: ["Çalışmalar", "Yaklaşım", "Çevrim içi randevu", "Deneyim"], start: "Web siteni oluştur", heroNote: "Masaüstü, tablet ve mobil. Tek ve özenli bir kimlik.", transformation: "Dönüşüm", identityLabels: ["Logo", "Fotoğraf", "Hizmetler", "Renk"], selected: "Seçili kimlikler",
    showcases: [{ category: "Güzellik / Wellness", description: "Yumuşak ışık, dokulu renk ve ferah tipografi sakin bir davet oluşturur.", traits: "Sıcak · Duyusal · Kişisel" }, { category: "Profesyonel hizmet", description: "Sakin otorite, mimari boşluklar ve amaca yönelik bilgi.", traits: "Net · Güvenli · İnsani" }, { category: "Zanaat / Atölye", description: "Güvene dayalı işletmeler için güçlü yapı ve doğrudan kanıt.", traits: "Doğrudan · Sağlam · Yetkin", title: "Doğru inşa edildi." }],
    pillars: [["Kimlik", "Karakteriniz görünür olur."], ["Hizmetler", "Yaptığınız iş netleşir."], ["Müşteriler", "Kime hizmet ettiğiniz anlaşılır."], ["Konum", "Güven yerelleşir."]], previewNav: ["Hakkımızda", "Hizmetler", "Yazılar", "İletişim"], previewMeta: ["Hizmet", "Ziyaret", "Çevrim içi"], previewConsultation: "Kişisel danışma", previewHours: "Pzt—Cmt", previewFast: "2 dakikada randevu", chooseExperience: "Deneyiminizi seçin", signature: "Özel hizmet", personal: "Kişisel danışma", variants: { construction: ["Kalıcı mekânlar", "Amaçla inşa edildi.", "Proje başlat"], professional: ["Bağımsız danışmanlık", "Gelecek kararlar için netlik.", "Danışma randevusu"], noir: ["Saç · form · kimlik", "Daha sakin bir özgüven.", "Ziyaret ayır"], lumen: ["Güzellik ve iyi yaşam", "Yeniden kendiniz gibi hissedin.", "Randevu al"] }, bookVisit: "Ziyaret ayır", selectService: "Hizmet seçin", appointments: "Randevular", newRequest: "Yeni talep", preferredDate: "Tercih edilen tarih", preferredTime: "Tercih edilen saat", status: "Durum", waiting: "Onay bekliyor", month: "EYL", flow: "Web sitesi → Uygulama", demoEyebrow: "Özel bir ön izleme", experience: "Deneyim", experienceItems: ["Randevu", "Harita ve konum", "Çalışma saatleri", "Görsel kimliğiniz"], mobileFirst: "Önce mobil", responsive: "Her ekrana uyumlu", mobileNote: "Müşterilerin en çok kullandığı ekran için", footer: "Kimlik · Sunum · Güven · Tasarım",
  },
  pl: {
    nav: ["Realizacje", "Podejście", "Rezerwacje online", "Doświadczenie"], start: "Stwórz stronę", heroNote: "Komputer, tablet i telefon. Jedna przemyślana tożsamość.", transformation: "Transformacja", identityLabels: ["Logo", "Fotografia", "Usługi", "Kolor"], selected: "Wybrane tożsamości",
    showcases: [{ category: "Beauty / Wellness", description: "Miękkie światło, namacalny kolor i przestronna typografia tworzą spokojne zaproszenie.", traits: "Ciepła · Zmysłowa · Osobista" }, { category: "Usługi profesjonalne", description: "Spokojny autorytet, architektoniczna przestrzeń i celowa informacja.", traits: "Jasna · Pewna · Ludzka" }, { category: "Rzemiosło", description: "Mocna struktura i konkretne dowody dla firm budowanych na zaufaniu.", traits: "Bezpośrednia · Solidna · Kompetentna", title: "Zbudowane właściwie." }],
    pillars: [["Tożsamość", "Twój charakter staje się widoczny."], ["Usługi", "To, co robisz, staje się jasne."], ["Klienci", "Rozumiemy, komu służysz."], ["Lokalizacja", "Zaufanie staje się lokalne."]], previewNav: ["O nas", "Usługi", "Magazyn", "Kontakt"], previewMeta: ["Usługa", "Wizyta", "Online"], previewConsultation: "Konsultacja osobista", previewHours: "Pon—Sob", previewFast: "Rezerwacja w 2 minuty", chooseExperience: "Wybierz doświadczenie", signature: "Usługa specjalna", personal: "Konsultacja osobista", variants: { construction: ["Przestrzenie na lata", "Zbudowane z celem.", "Rozpocznij projekt"], professional: ["Niezależne doradztwo", "Jasność dla przyszłych decyzji.", "Umów konsultację"], noir: ["Włosy · forma · tożsamość", "Spokojniejsza pewność siebie.", "Zarezerwuj wizytę"], lumen: ["Piękno i dobre samopoczucie", "Znów poczuj się sobą.", "Umów termin"] }, bookVisit: "Zarezerwuj wizytę", selectService: "Wybierz usługę", appointments: "Rezerwacje", newRequest: "Nowa prośba", preferredDate: "Preferowana data", preferredTime: "Preferowana godzina", status: "Status", waiting: "Czeka na potwierdzenie", month: "WRZ", flow: "Strona → Aplikacja", demoEyebrow: "Prywatny podgląd", experience: "Doświadczenie", experienceItems: ["Rezerwacja", "Mapa i lokalizacja", "Godziny otwarcia", "Twoja tożsamość wizualna"], mobileFirst: "Najpierw telefon", responsive: "Responsywny z założenia", mobileNote: "Dla ekranu najczęściej używanego przez klientów", footer: "Tożsamość · Prezentacja · Zaufanie · Design",
  },
};

function getPreviewStyle(src: string, ui: LocalUi) {
  if (src.includes("construction")) return { brand: "KERNBAU", values: ui.variants.construction, surface: "bg-[#e5dfd2]", ink: "text-[#1c1c19]", accent: "bg-[#dd6b32]", imageSide: "order-2" };
  if (src.includes("professional")) return { brand: "NORTH / FIELD", values: ui.variants.professional, surface: "bg-[#eef0e9]", ink: "text-[#173029]", accent: "bg-[#9ebbad]", imageSide: "order-2" };
  if (src.includes("noir")) return { brand: "NOIR STUDIO", values: ui.variants.noir, surface: "bg-[#171717]", ink: "text-[#f3eee5]", accent: "bg-[#b58b6b]", imageSide: "order-1" };
  return { brand: "LUMEN", values: ui.variants.lumen, surface: "bg-[#f0e5d7]", ink: "text-[#3b302a]", accent: "bg-[#b96f59]", imageSide: "order-1" };
}

function BrowserFrame({ src, alt, ui, dark = false, className = "" }: { src: string; alt: string; ui: LocalUi; dark?: boolean; className?: string }) {
  const style = getPreviewStyle(src, ui);
  const [kicker, title, action] = style.values;
  return <div className={`overflow-hidden rounded-md border ${dark ? "border-white/15 bg-[#1d1d1b]" : "border-[#27251f]/15 bg-[#fbf8f0]"} ${className}`}>
    <div className={`flex h-9 items-center gap-1.5 border-b px-3 ${dark ? "border-white/10" : "border-[#27251f]/10"}`}><span className="h-1.5 w-1.5 rounded-full bg-[#d16b55]" /><span className="h-1.5 w-1.5 rounded-full bg-[#d4b978]" /><span className="h-1.5 w-1.5 rounded-full bg-[#81998b]" /><span className={`mx-auto h-4 w-1/3 rounded-full ${dark ? "bg-white/[.06]" : "bg-black/[.05]"}`} /></div>
    <div className={`${style.surface} ${style.ink}`}>
      <div className="flex h-11 items-center justify-between border-b border-current/10 px-4 sm:px-5"><span className="text-[9px] font-black tracking-[.18em]">{style.brand}</span><div className="hidden items-center gap-4 text-[7px] font-bold uppercase tracking-wider opacity-65 sm:flex">{ui.previewNav.map((item) => <span key={item}>{item}</span>)}</div><span className="rounded-full border border-current/20 px-2.5 py-1 text-[7px] font-bold">{action}</span></div>
      <div className="grid min-h-[230px] grid-cols-[1.05fr_.95fr] sm:min-h-[300px]"><div className={`relative min-h-[230px] overflow-hidden sm:min-h-[300px] ${style.imageSide}`}><img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" /></div><div className="flex flex-col justify-center p-5 sm:p-8"><p className="text-[7px] font-bold uppercase tracking-[.2em] opacity-60">{kicker}</p><p className="mt-4 max-w-xs font-serif text-2xl leading-[.95] tracking-[-.04em] sm:text-4xl">{title}</p><span className={`mt-6 inline-flex w-fit rounded-full px-3 py-2 text-[7px] font-black uppercase tracking-wide text-white ${style.accent}`}>{action}</span></div></div>
      <div className="grid grid-cols-3 border-t border-current/10"><div className="p-3 sm:p-4"><p className="text-[6px] uppercase tracking-widest opacity-50">{ui.previewMeta[0]}</p><p className="mt-2 text-[8px] font-bold sm:text-[10px]">{ui.previewConsultation}</p></div><div className="border-x border-current/10 p-3 sm:p-4"><p className="text-[6px] uppercase tracking-widest opacity-50">{ui.previewMeta[1]}</p><p className="mt-2 text-[8px] font-bold sm:text-[10px]">{ui.previewHours}</p></div><div className="p-3 sm:p-4"><p className="text-[6px] uppercase tracking-widest opacity-50">{ui.previewMeta[2]}</p><p className="mt-2 text-[8px] font-bold sm:text-[10px]">{ui.previewFast}</p></div></div>
    </div>
  </div>;
}

function PhoneFrame({ src, alt, ui, className = "" }: { src: string; alt: string; ui: LocalUi; className?: string }) {
  const style = getPreviewStyle(src, ui);
  const [, title, action] = style.values;
  return <div className={`rounded-[2rem] border-[5px] border-[#24231f] bg-[#24231f] p-1 shadow-[0_28px_70px_rgba(35,31,24,.28)] ${className}`}><div className={`relative overflow-hidden rounded-[1.45rem] ${style.surface} ${style.ink}`}><span className="absolute left-1/2 top-2 z-20 h-3 w-14 -translate-x-1/2 rounded-full bg-[#24231f]" /><div className="relative z-10 flex h-12 items-end justify-between px-4 pb-2"><span className="text-[7px] font-black tracking-[.16em]">{style.brand}</span><Menu className="h-3 w-3" /></div><div className="relative h-40 overflow-hidden"><img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" /><p className="absolute bottom-3 left-3 right-3 font-serif text-xl leading-[.9] text-white">{title}</p></div><div className="p-4"><p className="text-[7px] font-bold uppercase tracking-[.16em] opacity-55">{ui.chooseExperience}</p><div className="mt-3 space-y-2">{[ui.signature, ui.personal].map((service, index) => <div key={service} className="flex items-center justify-between border-b border-current/10 pb-2 text-[8px] font-bold"><span>{service}</span><span>0{index + 1}</span></div>)}</div><span className={`mt-4 block rounded-full py-2 text-center text-[7px] font-black uppercase tracking-wide text-white ${style.accent}`}>{action}</span></div></div></div>;
}

export default async function BusinessSiteLanding() {
  const locale = toAppLocale(await getLocale());
  const t = copy[locale];
  const booking = bookingCopy[locale];
  const offer = offerCopy[locale];
  const ui = uiCopy[locale];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f3efe6] text-[#25231f]">
      <header className="relative z-30 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-6 sm:px-10 lg:px-14">
        <a href="/businesssite" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full border border-[#25231f] font-serif text-lg italic">B</span><span className="text-sm font-bold tracking-[-.02em]">BusinessSite</span></a>
        <nav className="hidden items-center gap-7 text-xs font-semibold md:flex">{ui.nav.map((item, index) => <a key={item} href={["#work", "#approach", "#booking", "#experience"][index]} className="transition hover:opacity-55">{item}</a>)}</nav>
        <div className="flex items-center gap-2"><div className="businesssite-locale"><LanguageSwitcher compact /></div><Link href="/signup?next=%2Fbusinesssite%2Fstart" className="group inline-flex items-center gap-2 rounded-full border border-[#25231f] px-3 py-2.5 text-xs font-bold transition hover:bg-[#25231f] hover:text-white sm:px-4">{ui.start} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></Link></div>
      </header>

      <section className="relative mx-auto max-w-[1440px] px-5 pb-24 pt-12 sm:px-10 lg:px-14 lg:pb-36 lg:pt-20">
        <div aria-hidden="true" className="absolute -right-40 top-0 h-[500px] w-[500px] rounded-full bg-[#d9bca4]/30 blur-[90px]" />
        <p className="relative text-[10px] font-bold uppercase tracking-[.25em] text-[#8a5c48]">{t.eyebrow}</p>
        <h1 className="relative mt-7 max-w-[1200px] font-serif text-[clamp(3.8rem,9.2vw,9rem)] leading-[.85] tracking-[-.065em]">{t.hero}</h1>
        <div className="relative mt-10 grid gap-8 lg:grid-cols-[1fr_.85fr] lg:items-end"><p className="max-w-xl text-lg leading-8 text-[#625e57] sm:text-xl">{t.intro}</p><div className="flex flex-wrap gap-3 lg:justify-end"><Link href="/signup?next=%2Fbusinesssite%2Fstart" className="group inline-flex items-center gap-3 rounded-full bg-[#25231f] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#8a5c48]">{t.primary}<ArrowDownRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:translate-y-0.5" /></Link><a href="#work" className="rounded-full border border-[#25231f]/20 bg-white/40 px-6 py-3.5 text-sm font-bold transition hover:bg-white">{t.view}</a></div></div>
        <div className="relative mt-20 min-h-[610px] sm:min-h-[780px] lg:min-h-[850px]"><BrowserFrame ui={ui} src="/images/templates/businesssite-hair-editorial-v1.png" alt="Editorial beauty business website" className="absolute left-0 top-0 w-[94%] shadow-[0_35px_100px_rgba(45,38,30,.18)] lg:w-[76%]" /><div className="absolute right-0 top-[34%] w-[68%] rounded-[1.5rem] border-[7px] border-[#3a3833] bg-[#3a3833] p-1 shadow-[0_35px_100px_rgba(45,38,30,.24)] sm:w-[56%] lg:w-[46%]"><BrowserFrame ui={ui} src="/images/templates/businesssite-professional-consultation-v1.png" alt="Professional services website on tablet" className="rounded-[.85rem] border-0" /></div><PhoneFrame ui={ui} src="/images/templates/businesssite-hair-lumen-v1.png" alt="Business website mobile experience" className="absolute bottom-0 left-[4%] z-10 w-[155px] sm:left-[9%] sm:w-[220px]" /><div className="absolute bottom-[3%] right-[2%] hidden w-56 -rotate-2 bg-[#d9cfb9] p-5 shadow-xl md:block"><Sparkles className="h-4 w-4 text-[#9a5c46]" /><p className="mt-8 font-serif text-2xl leading-tight">{ui.heroNote}</p></div></div>
      </section>

      <section id="approach" className="bg-[#292824] px-5 py-24 text-[#f5f0e6] sm:px-10 lg:py-36"><div className="mx-auto max-w-[1320px]"><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#d6ad8f]">01 · {ui.transformation}</p><div className="mt-7 grid gap-10 lg:grid-cols-[.85fr_1.15fr]"><h2 className="max-w-xl font-serif text-5xl leading-[.96] tracking-[-.045em] sm:text-7xl">{t.identity}</h2><p className="max-w-xl self-end text-lg leading-8 text-[#bab6ae]">{t.identityText}</p></div>
          <div className="mt-16 grid items-center gap-10 lg:grid-cols-[.75fr_auto_1.25fr]"><div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-white/10">{ui.identityLabels.map((label, index) => <div key={label} className="min-h-40 bg-[#34332e] p-5"><span className="text-[9px] uppercase tracking-[.2em] text-[#89867f]">{label}</span><span className={`mt-14 block ${index === 3 ? "text-[#bd7e60]" : "font-serif text-4xl"}`}>{["Aa", "◌", "04", "●"][index]}</span></div>)}</div><ArrowRight className="mx-auto h-7 w-7 text-[#d6ad8f] lg:mx-0" /><BrowserFrame ui={ui} src="/images/templates/businesssite-hair-noir-v1.png" alt="Finished premium website identity" dark className="shadow-[0_40px_100px_rgba(0,0,0,.35)]" /></div>
        </div></section>

      <section id="work" className="px-5 py-24 sm:px-10 lg:py-36"><div className="mx-auto max-w-[1320px]"><div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#8a5c48]">02 · {ui.selected}</p><h2 className="mt-7 max-w-3xl font-serif text-5xl leading-[.94] tracking-[-.045em] sm:text-7xl">{t.showcase}</h2></div><p className="max-w-xl self-end text-lg leading-8 text-[#68635c]">{t.showcaseText}</p></div>
          <div className="mt-20 space-y-20 lg:space-y-28">
            <article className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]"><BrowserFrame ui={ui} src="/images/templates/businesssite-hair-lumen-v1.png" alt="Lumen beauty and wellness identity" className="bg-[#e8dbc9]" /><div className="flex flex-col justify-between bg-[#d8c6ae] p-7 sm:p-10"><div className="flex items-center justify-between text-[10px] uppercase tracking-[.2em]"><span>{ui.showcases[0].category}</span><span>01</span></div><div className="my-16"><p className="font-serif text-5xl italic">Lumen</p><p className="mt-5 leading-7 text-[#615548]">{ui.showcases[0].description}</p></div><span className="text-xs font-bold uppercase tracking-widest">{ui.showcases[0].traits}</span></div></article>
            <article className="grid gap-5 lg:grid-cols-[.62fr_1.38fr]"><div className="flex min-h-[360px] flex-col justify-between bg-[#162c27] p-7 text-[#eff1e7] sm:p-10"><div className="flex items-center justify-between text-[10px] uppercase tracking-[.2em] text-[#abc3b9]"><span>{ui.showcases[1].category}</span><span>02</span></div><div className="my-16"><p className="text-4xl font-light tracking-[-.04em]">North & Field</p><p className="mt-5 leading-7 text-[#abc3b9]">{ui.showcases[1].description}</p></div><span className="text-xs font-bold uppercase tracking-widest text-[#abc3b9]">{ui.showcases[1].traits}</span></div><BrowserFrame ui={ui} src="/images/templates/businesssite-professional-consultation-v1.png" alt="Professional consultancy identity" /></article>
            <article className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><BrowserFrame ui={ui} src="/images/templates/businesssite-construction-plans-v1.png" alt="Construction and trades identity" className="bg-[#d8d4c9]" /><div className="relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-[#dd6b32] p-7 text-[#1c1b18] sm:p-10"><div className="absolute -right-20 top-20 h-64 w-64 rotate-12 border-[26px] border-[#1c1b18]/10" /><div className="relative flex items-center justify-between text-[10px] uppercase tracking-[.2em]"><span>{ui.showcases[2].category}</span><span>03</span></div><div className="relative my-16"><p className="text-5xl font-black uppercase tracking-[-.06em]">{ui.showcases[2].title}</p><p className="mt-5 max-w-xs leading-7">{ui.showcases[2].description}</p></div><span className="relative text-xs font-bold uppercase tracking-widest">{ui.showcases[2].traits}</span></div></article>
          </div>
        </div></section>

      <section className="border-y border-[#282621]/10 bg-[#e4ddd0] px-5 py-24 sm:px-10 lg:py-32"><div className="mx-auto max-w-[1320px]"><p className="max-w-5xl font-serif text-5xl leading-[.98] tracking-[-.045em] sm:text-7xl lg:text-8xl">{t.built}</p><div className="mt-16 grid border-l border-t border-[#282621]/15 sm:grid-cols-2 lg:grid-cols-4">{ui.pillars.map(([title, text], index) => <article key={title} className="min-h-56 border-b border-r border-[#282621]/15 p-6"><span className="text-[10px] font-bold tracking-widest text-[#8a5c48]">0{index + 1}</span><h3 className="mt-20 font-serif text-3xl">{title}</h3><p className="mt-2 text-sm text-[#6b655d]">{text}</p></article>)}</div></div></section>

      <section id="booking" className="overflow-hidden bg-[#18342e] px-5 py-24 text-[#f7f2e9] sm:px-10 lg:py-36">
        <div className="mx-auto max-w-[1320px]">
          <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#b9d8ca]">04 · {booking.eyebrow}</p><h2 className="mt-7 max-w-3xl font-serif text-5xl leading-[.94] tracking-[-.045em] sm:text-7xl">{booking.title}</h2></div><div><p className="max-w-xl text-lg leading-8 text-[#bfd0c9]">{booking.text}</p><span className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#b9d8ca]/30 px-4 py-2 text-xs font-bold text-[#dcebe4]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#8ee0b9]" />{booking.direct}</span></div></div>
          <div className="relative mt-16 grid gap-12 rounded-[2rem] border border-white/10 bg-[#102721] p-5 sm:p-8 lg:grid-cols-[.8fr_auto_1.2fr] lg:items-center lg:gap-8 lg:p-12">
            <div className="relative mx-auto w-full max-w-[270px]"><div className="rounded-[2.4rem] border-[7px] border-[#292b29] bg-[#292b29] p-1 shadow-[0_30px_70px_rgba(0,0,0,.35)]"><div className="overflow-hidden rounded-[1.75rem] bg-[#f2e8db] text-[#352e28]"><div className="relative h-36"><img src="/images/templates/businesssite-hair-lumen-v1.png" alt="Online appointment website" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" /><span className="absolute bottom-3 left-4 font-serif text-xl text-white">{ui.bookVisit}</span></div><div className="p-4"><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#8a6251]">{ui.selectService}</p><div className="mt-3 rounded-xl border border-[#342d27]/10 bg-white p-3 text-[9px] font-bold">{ui.signature} <CheckCircle2 className="float-right h-3.5 w-3.5 text-[#9a654d]" /></div><div className="mt-3 grid grid-cols-3 gap-1.5">{["14", "15", "16"].map((date, index) => <span key={date} className={`rounded-lg py-2 text-center text-[9px] font-bold ${index === 1 ? "bg-[#9a654d] text-white" : "bg-white"}`}>{date}<small className="mt-0.5 block text-[6px] font-medium opacity-60">{ui.month}</small></span>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><span className="rounded-full border border-[#342d27]/15 py-2 text-center text-[8px]">10:30</span><span className="rounded-full bg-[#352e28] py-2 text-center text-[8px] font-bold text-white">11:00</span></div><div className="mt-4 flex items-center gap-2 rounded-xl bg-[#dfece5] p-3 text-[8px] font-bold text-[#1f5143]"><CheckCircle2 className="h-4 w-4" />{booking.request}</div></div></div></div></div>
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#8ee0b9]/25 bg-[#18342e] text-[#8ee0b9] lg:h-24 lg:w-24"><ArrowRight className="h-6 w-6 rotate-90 lg:rotate-0" /><span className="absolute -bottom-7 whitespace-nowrap text-[8px] font-bold uppercase tracking-[.18em] text-[#7cae9c]">{ui.flow}</span></div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#f3f5f1] text-[#1d2925] shadow-[0_30px_80px_rgba(0,0,0,.28)]"><div className="flex h-14 items-center justify-between border-b border-[#1d2925]/10 px-5"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#173c32] text-[10px] font-black text-white">B</span><div><p className="text-[9px] font-black">BusinessSite</p><p className="text-[7px] text-[#718078]">{ui.appointments}</p></div></div><Bell className="h-4 w-4 text-[#326555]" /></div><div className="p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#45806d]">{booking.app}</p><p className="mt-2 text-xl font-black">Elira Dema</p><p className="mt-1 text-xs text-[#68756f]">{ui.signature}</p></div><span className="rounded-full bg-[#dff2e9] px-3 py-1.5 text-[8px] font-black text-[#326555]">{ui.newRequest}</span></div><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white p-4"><CalendarDays className="h-4 w-4 text-[#45806d]" /><p className="mt-4 text-[8px] uppercase tracking-wider text-[#8a948f]">{ui.preferredDate}</p><p className="mt-1 text-xs font-black">15 {ui.month}</p></div><div className="rounded-xl bg-white p-4"><Clock3 className="h-4 w-4 text-[#45806d]" /><p className="mt-4 text-[8px] uppercase tracking-wider text-[#8a948f]">{ui.preferredTime}</p><p className="mt-1 text-xs font-black">11:00</p></div></div><div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#1d2925]/10 bg-white p-4"><div><p className="text-[8px] uppercase tracking-wider text-[#8a948f]">{ui.status}</p><p className="mt-1 text-xs font-bold">{ui.waiting}</p></div><span className="rounded-lg bg-[#173c32] px-4 py-2.5 text-center text-[8px] font-black uppercase tracking-wide text-white">{booking.confirm}</span></div></div></div>
          </div>
        </div>
      </section>

      <section id="experience" className="px-5 py-24 sm:px-10 lg:py-36"><div className="mx-auto grid max-w-[1320px] gap-16 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#8a5c48]">05 · {ui.experience}</p><h2 className="mt-7 font-serif text-5xl leading-[.95] tracking-[-.045em] sm:text-7xl">{t.more}</h2><p className="mt-7 max-w-xl text-lg leading-8 text-[#68635c]">{t.moreText}</p><div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-[#25231f]/15 pt-7 text-sm font-bold">{[CalendarDays, MapPin, Clock3, Palette].map((Icon, index) => <span key={ui.experienceItems[index]} className="flex items-center gap-3"><Icon className="h-4 w-4 text-[#9a654d]" />{ui.experienceItems[index]}</span>)}</div></div>
          <div className="relative min-h-[590px] overflow-hidden bg-[#c9b395] p-7 sm:min-h-[700px] sm:p-12"><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.2em]"><span className="flex items-center gap-2"><TabletSmartphone className="h-4 w-4" />{ui.mobileFirst}</span><span>{ui.responsive}</span></div><div className="absolute bottom-20 right-[4%] hidden w-[62%] rounded-[1.5rem] border-[7px] border-[#393732] bg-[#393732] p-1 shadow-[0_30px_70px_rgba(35,31,24,.2)] sm:block"><BrowserFrame ui={ui} src="/images/templates/businesssite-professional-consultation-v1.png" alt="Tablet business website" className="rounded-[.85rem] border-0" /></div><PhoneFrame ui={ui} src="/images/templates/businesssite-hair-editorial-v1.png" alt="Mobile-first business website" className="absolute bottom-10 left-[8%] z-10 w-[225px] sm:w-[260px]" /><div className="absolute bottom-12 right-8 hidden rounded-full bg-[#f3efe6] px-4 py-2 text-xs font-bold lg:block"><Globe2 className="mr-2 inline h-3.5 w-3.5" />{ui.mobileNote}</div></div></div></section>

      <section className="border-t border-[#25231f]/10 bg-[#e8e0d3] px-5 py-24 sm:px-10 lg:py-32"><div className="mx-auto max-w-[1320px]"><div className="grid gap-8 lg:grid-cols-[1fr_.8fr]"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#8a5c48]">06 · {offer.eyebrow}</p><h2 className="mt-7 max-w-4xl font-serif text-5xl leading-[.94] tracking-[-.045em] sm:text-7xl">{offer.title}</h2></div><p className="max-w-xl self-end text-lg leading-8 text-[#68635c]">{offer.text}</p></div><div className="mt-16 grid border-l border-t border-[#25231f]/15 lg:grid-cols-3">{[Globe2, CalendarDays, Megaphone].map((Icon, index) => <article key={offer.services[index][0]} className="min-h-[310px] border-b border-r border-[#25231f]/15 bg-[#f5f0e7]/55 p-7 sm:p-9"><Icon className="h-6 w-6 text-[#8a5c48]" /><p className="mt-16 text-[10px] font-bold tracking-widest text-[#8a5c48]">0{index + 1}</p><h3 className="mt-4 font-serif text-3xl">{offer.services[index][0]}</h3><p className="mt-4 max-w-sm leading-7 text-[#68635c]">{offer.services[index][1]}</p></article>)}</div><div className="grid border-x border-b border-[#25231f]/15 sm:grid-cols-3">{offer.promises.map((promise) => <div key={promise} className="flex items-center gap-3 border-b border-[#25231f]/15 px-6 py-5 text-sm font-bold last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#8a5c48]" />{promise}</div>)}</div></div></section>

      <section id="demo" className="bg-[#8a5c48] px-5 py-24 text-[#fffaf1] sm:px-10 lg:py-36"><div className="mx-auto max-w-[1320px]"><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#e5cdbd]">{ui.demoEyebrow}</p><h2 className="mt-8 max-w-6xl font-serif text-6xl leading-[.88] tracking-[-.055em] sm:text-8xl lg:text-[8.5rem]">{t.closing}</h2><div className="mt-12 flex flex-col gap-8 border-t border-white/25 pt-8 lg:flex-row lg:items-center lg:justify-between"><p className="max-w-xl text-lg leading-8 text-white/75">{t.closingText}</p><Link href="/signup?next=%2Fbusinesssite%2Fstart" className="group inline-flex w-fit items-center gap-3 rounded-full bg-[#fffaf1] px-6 py-4 text-sm font-bold text-[#4b352c] transition hover:bg-[#292824] hover:text-white">{t.primary}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link></div></div></section>

      <footer className="flex flex-col gap-5 bg-[#292824] px-5 py-8 text-xs text-[#a8a39a] sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-14"><span className="font-bold text-white">BusinessSite</span><span>{ui.footer}</span><span>© 2026</span></footer>
    </main>
  );
}
