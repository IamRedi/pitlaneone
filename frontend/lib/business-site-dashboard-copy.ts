import type { AppLocale } from "@/i18n/config";

type DashboardCopy = {
  eyebrow: string;
  intro: string;
  draft: string;
  live: string;
  progress: string;
  ready: string;
  remaining: string;
  setupTitle: string;
  setupBody: string;
  done: string;
  todo: string;
  editWebsite: string;
  openWebsite: string;
  identityTitle: string;
  identityBody: string;
  photosTitle: string;
  photosBody: string;
  catalogTitle: string;
  catalogBody: string;
  bookingTitle: string;
  bookingBody: string;
  publishTitle: string;
  publishBody: string;
  requestsTitle: string;
  requestsBody: string;
  productsTitle: string;
  productsBody: string;
  editorEyebrow: string;
  editorTitle: string;
  editorDescription: string;
  livePreview: string;
  previewHint: string;
  desktop: string;
  mobile: string;
};

export const businessSiteDashboardCopy: Record<AppLocale, DashboardCopy> = {
  sq: {
    eyebrow: "Paneli BusinessSite", intro: "Përfundo detajet, kontrollo pamjen dhe publiko website-in kur të jesh gati.", draft: "Privat", live: "Online", progress: "Progresi i website-it", ready: "gati", remaining: "hapa të mbetur", setupTitle: "Hapat e publikimit", setupBody: "Çdo hap të çon direkt te pjesa që duhet rregulluar.", done: "Përfunduar", todo: "Për t’u plotësuar", editWebsite: "Ndrysho website-in", openWebsite: "Hap website-in", identityTitle: "Tekstet dhe kontakti", identityBody: "Kontrollo titujt, përshkrimin dhe të dhënat e kontaktit.", photosTitle: "Logoja dhe fotot", photosBody: "Shto fotografinë kryesore dhe identitetin vizual.", catalogTitle: "Produkte dhe oferta", catalogBody: "Prezanto të paktën një produkt, shërbim ose ofertë.", bookingTitle: "Terminet online", bookingBody: "Kontrollo oraret dhe kërkesat që vijnë nga website-i.", publishTitle: "Publiko website-in", publishBody: "Bëje website-in të dukshëm për klientët.", requestsTitle: "Kërkesa të hapura", requestsBody: "Kërkesa për termine që presin përgjigjen tënde.", productsTitle: "Produkte aktive", productsBody: "Produkte dhe shërbime të shfaqura në website.", editorEyebrow: "Editori BusinessSite", editorTitle: "Përmbajtja dhe fotot e website-it", editorDescription: "Ndrysho të dhënat, tekstet dhe fotot. Stili unik i kategorisë ruhet automatikisht.", livePreview: "Pamje live", previewHint: "Ndryshimet shfaqen këtu para se t’i ruash.", desktop: "Desktop", mobile: "Telefon",
  },
  de: {
    eyebrow: "BusinessSite Übersicht", intro: "Vervollständigen Sie die Details, prüfen Sie die Ansicht und veröffentlichen Sie die Website, wenn alles bereit ist.", draft: "Privat", live: "Online", progress: "Website-Fortschritt", ready: "bereit", remaining: "Schritte offen", setupTitle: "Schritte zur Veröffentlichung", setupBody: "Jeder Schritt führt direkt zum passenden Bereich.", done: "Erledigt", todo: "Noch offen", editWebsite: "Website bearbeiten", openWebsite: "Website öffnen", identityTitle: "Texte und Kontakt", identityBody: "Prüfen Sie Überschriften, Beschreibung und Kontaktdaten.", photosTitle: "Logo und Fotos", photosBody: "Ergänzen Sie das Hauptbild und Ihre visuelle Identität.", catalogTitle: "Produkte und Angebote", catalogBody: "Präsentieren Sie mindestens ein Produkt, eine Leistung oder ein Angebot.", bookingTitle: "Online-Termine", bookingBody: "Prüfen Sie Öffnungszeiten und Anfragen von der Website.", publishTitle: "Website veröffentlichen", publishBody: "Machen Sie die Website für Kunden sichtbar.", requestsTitle: "Offene Anfragen", requestsBody: "Terminanfragen, die auf Ihre Antwort warten.", productsTitle: "Aktive Produkte", productsBody: "Produkte und Leistungen, die auf der Website erscheinen.", editorEyebrow: "BusinessSite Editor", editorTitle: "Inhalte und Fotos Ihrer Website", editorDescription: "Bearbeiten Sie Daten, Texte und Fotos. Der individuelle Stil Ihrer Kategorie bleibt automatisch erhalten.", livePreview: "Live-Vorschau", previewHint: "Änderungen erscheinen hier, bevor Sie sie speichern.", desktop: "Desktop", mobile: "Mobil",
  },
  en: {
    eyebrow: "BusinessSite dashboard", intro: "Complete the details, review the result and publish the website when you are ready.", draft: "Private", live: "Online", progress: "Website progress", ready: "ready", remaining: "steps remaining", setupTitle: "Publishing checklist", setupBody: "Each step takes you directly to the section that needs attention.", done: "Complete", todo: "Needs attention", editWebsite: "Edit website", openWebsite: "Open website", identityTitle: "Copy and contact", identityBody: "Review the headings, description and contact details.", photosTitle: "Logo and photos", photosBody: "Add the main photo and your visual identity.", catalogTitle: "Products and offers", catalogBody: "Show at least one product, service or offer.", bookingTitle: "Online appointments", bookingBody: "Review opening hours and requests coming from the website.", publishTitle: "Publish the website", publishBody: "Make the website visible to customers.", requestsTitle: "Open requests", requestsBody: "Appointment requests waiting for your response.", productsTitle: "Active products", productsBody: "Products and services currently shown on the website.", editorEyebrow: "BusinessSite editor", editorTitle: "Your website content and photos", editorDescription: "Edit business details, copy and photos. The distinctive category style is preserved automatically.", livePreview: "Live preview", previewHint: "Changes appear here before you save them.", desktop: "Desktop", mobile: "Mobile",
  },
  it: {
    eyebrow: "Pannello BusinessSite", intro: "Completa i dettagli, controlla il risultato e pubblica il sito quando è pronto.", draft: "Privato", live: "Online", progress: "Avanzamento del sito", ready: "pronto", remaining: "passaggi rimanenti", setupTitle: "Passaggi per la pubblicazione", setupBody: "Ogni passaggio porta direttamente alla sezione da completare.", done: "Completato", todo: "Da completare", editWebsite: "Modifica il sito", openWebsite: "Apri il sito", identityTitle: "Testi e contatti", identityBody: "Controlla titoli, descrizione e dati di contatto.", photosTitle: "Logo e foto", photosBody: "Aggiungi l’immagine principale e la tua identità visiva.", catalogTitle: "Prodotti e offerte", catalogBody: "Presenta almeno un prodotto, servizio o offerta.", bookingTitle: "Appuntamenti online", bookingBody: "Controlla orari e richieste ricevute dal sito.", publishTitle: "Pubblica il sito", publishBody: "Rendi il sito visibile ai clienti.", requestsTitle: "Richieste aperte", requestsBody: "Richieste di appuntamento in attesa di risposta.", productsTitle: "Prodotti attivi", productsBody: "Prodotti e servizi mostrati sul sito.", editorEyebrow: "Editor BusinessSite", editorTitle: "Contenuti e foto del sito", editorDescription: "Modifica dati, testi e foto. Lo stile unico della categoria viene mantenuto automaticamente.", livePreview: "Anteprima live", previewHint: "Le modifiche appaiono qui prima del salvataggio.", desktop: "Desktop", mobile: "Mobile",
  },
  tr: {
    eyebrow: "BusinessSite paneli", intro: "Bilgileri tamamlayın, görünümü kontrol edin ve hazır olduğunda web sitesini yayınlayın.", draft: "Özel", live: "Yayında", progress: "Web sitesi ilerlemesi", ready: "hazır", remaining: "adım kaldı", setupTitle: "Yayınlama adımları", setupBody: "Her adım sizi doğrudan düzenlenecek bölüme götürür.", done: "Tamamlandı", todo: "Tamamlanmalı", editWebsite: "Web sitesini düzenle", openWebsite: "Web sitesini aç", identityTitle: "Metinler ve iletişim", identityBody: "Başlıkları, açıklamayı ve iletişim bilgilerini kontrol edin.", photosTitle: "Logo ve fotoğraflar", photosBody: "Ana fotoğrafı ve görsel kimliğinizi ekleyin.", catalogTitle: "Ürünler ve teklifler", catalogBody: "En az bir ürün, hizmet veya teklif gösterin.", bookingTitle: "Online randevular", bookingBody: "Çalışma saatlerini ve web sitesinden gelen talepleri kontrol edin.", publishTitle: "Web sitesini yayınla", publishBody: "Web sitesini müşterilere görünür yapın.", requestsTitle: "Açık talepler", requestsBody: "Yanıtınızı bekleyen randevu talepleri.", productsTitle: "Aktif ürünler", productsBody: "Web sitesinde gösterilen ürün ve hizmetler.", editorEyebrow: "BusinessSite editörü", editorTitle: "Web sitesi içeriği ve fotoğrafları", editorDescription: "Bilgileri, metinleri ve fotoğrafları düzenleyin. Kategoriye özel stil otomatik olarak korunur.", livePreview: "Canlı önizleme", previewHint: "Değişiklikler kaydetmeden önce burada görünür.", desktop: "Masaüstü", mobile: "Mobil",
  },
  pl: {
    eyebrow: "Panel BusinessSite", intro: "Uzupełnij dane, sprawdź wygląd i opublikuj stronę, gdy będzie gotowa.", draft: "Prywatna", live: "Online", progress: "Postęp strony", ready: "gotowe", remaining: "kroki pozostały", setupTitle: "Kroki do publikacji", setupBody: "Każdy krok prowadzi bezpośrednio do sekcji wymagającej uwagi.", done: "Gotowe", todo: "Do uzupełnienia", editWebsite: "Edytuj stronę", openWebsite: "Otwórz stronę", identityTitle: "Teksty i kontakt", identityBody: "Sprawdź nagłówki, opis i dane kontaktowe.", photosTitle: "Logo i zdjęcia", photosBody: "Dodaj zdjęcie główne i identyfikację wizualną.", catalogTitle: "Produkty i oferty", catalogBody: "Pokaż co najmniej jeden produkt, usługę lub ofertę.", bookingTitle: "Rezerwacje online", bookingBody: "Sprawdź godziny pracy i zapytania ze strony.", publishTitle: "Opublikuj stronę", publishBody: "Udostępnij stronę klientom.", requestsTitle: "Otwarte zapytania", requestsBody: "Zapytania o termin oczekujące na odpowiedź.", productsTitle: "Aktywne produkty", productsBody: "Produkty i usługi widoczne na stronie.", editorEyebrow: "Edytor BusinessSite", editorTitle: "Treści i zdjęcia strony", editorDescription: "Edytuj dane, teksty i zdjęcia. Unikalny styl kategorii zostaje zachowany automatycznie.", livePreview: "Podgląd na żywo", previewHint: "Zmiany pojawią się tutaj przed zapisaniem.", desktop: "Komputer", mobile: "Telefon",
  },
};
