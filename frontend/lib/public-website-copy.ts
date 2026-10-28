import type { AppLocale } from "@/i18n/config";

export type PublicWebsiteCopy = {
  automotiveService: string;
  home: string;
  about: string;
  services: string;
  prices: string;
  gallery: string;
  contact: string;
  whatsapp: string;
  directions: string;
  openMenu: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  contactCta: string;
  servicesCta: string;
  trustOneTitle: string;
  trustOneBody: string;
  trustTwoTitle: string;
  trustTwoBody: string;
  trustThreeTitle: string;
  trustThreeBody: string;
  aboutEyebrow: string;
  aboutTitle: string;
  aboutBody: string;
  teamCta: string;
  servicesEyebrow: string;
  servicesTitle: string;
  servicesBody: string;
  serviceOneTitle: string;
  serviceOneBody: string;
  serviceTwoTitle: string;
  serviceTwoBody: string;
  serviceThreeTitle: string;
  serviceThreeBody: string;
  catalogEyebrow: string;
  catalogTitle: string;
  catalogBody: string;
  service: string;
  product: string;
  offer: string;
  galleryEyebrow: string;
  galleryTitle: string;
  galleryAlt: string;
  contactTitle: string;
  contactBody: string;
  contactPending: string;
  appointmentEyebrow: string;
  appointmentTitle: string;
  appointmentBody: string;
  appointmentName: string;
  appointmentPhone: string;
  appointmentService: string;
  appointmentChooseService: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentNote: string;
  appointmentSubmit: string;
  appointmentPending: string;
  appointmentSuccess: string;
  appointmentError: string;
  companyPanel: string;
  poweredBy: string;
  legalNotice: string;
  privacyPolicy: string;
};

export const publicWebsiteCopy: Record<AppLocale, PublicWebsiteCopy> = {
  sq: {
    automotiveService: "Sherbim automobilistik", home: "Kryefaqja", about: "Rreth nesh", services: "Sherbimet", prices: "Cmimet", gallery: "Galeria", contact: "Kontakt", whatsapp: "WhatsApp", directions: "Udhëzime", openMenu: "Hap menune",
    heroEyebrow: "Autoservis profesional", heroTitle: "Mirembajtje e besueshme per automjetin tuaj", heroSubtitle: "Pune e kujdesshme, komunikim i qarte dhe histori sherbimesh e mbajtur ne rregull.", contactCta: "Kerkoni kontakt", servicesCta: "Shiko sherbimet",
    trustOneTitle: "Pune e dokumentuar", trustOneBody: "Historiku mbahet i qarte per cdo automjet.", trustTwoTitle: "Kujdes ne kohe", trustTwoBody: "Sherbimet planifikohen sipas nevojave tuaja.", trustThreeTitle: "Komunikim i hapur", trustThreeBody: "Informacion i kuptueshem para cdo pune.",
    aboutEyebrow: "Rreth kompanise", aboutTitle: "Kujdes profesional per cdo kilometer.", aboutBody: "Ne fokusohemi te puna e sakte, transparenca dhe nje eksperience e qete per cdo klient.", teamCta: "Fol me ekipin tone",
    servicesEyebrow: "Cfare ofrojme", servicesTitle: "Sherbime qe mbajne automjetin ne forme", servicesBody: "Nga kontrolli fillestar deri te perfundimi i punes, informacioni mbahet i qarte dhe praktik.", serviceOneTitle: "Diagnostikim i sakte", serviceOneBody: "Kontroll i qarte i gjendjes se automjetit dhe hapat e rekomanduar.", serviceTwoTitle: "Mirembajtje periodike", serviceTwoBody: "Sherbime te planifikuara per ta mbajtur automjetin ne forme.", serviceThreeTitle: "Riparime profesionale", serviceThreeBody: "Pune e dokumentuar, komunikim i qarte dhe kujdes per detajet.",
    catalogEyebrow: "Katalogu", catalogTitle: "Produkte dhe cmime", catalogBody: "Cmime te qarta per produktet dhe sherbimet qe ofrojme.", service: "Sherbim", product: "Produkt", offer: "Oferte",
    galleryEyebrow: "Pune te fundit", galleryTitle: "Galeria e servisit", galleryAlt: "Pune nga", contactTitle: "Na kontaktoni per automjetin tuaj", contactBody: "Kontaktoni ekipin per informacion, planifikim ose nje bisede te shpejte.", contactPending: "Te dhenat e kontaktit do te publikohen se shpejti.", appointmentEyebrow: "Kerkese per termin", appointmentTitle: "Na dergoni kerkesen tuaj", appointmentBody: "Ne do t'ju kontaktojme per ta konfirmuar terminin. Kerkesa nuk eshte konfirmim automatik.", appointmentName: "Emri dhe mbiemri", appointmentPhone: "Telefoni", appointmentService: "Sherbimi i deshiruar", appointmentChooseService: "Zgjidh sherbimin", appointmentDate: "Data e preferuar", appointmentTime: "Ora e preferuar", appointmentNote: "Shenim (opsional)", appointmentSubmit: "Dergo kerkesen", appointmentPending: "Duke derguar...", appointmentSuccess: "Kerkesa u dergua. Ekipi do t'ju kontaktoje per konfirmim.", appointmentError: "Kerkesa nuk u dergua. Kontrolloni fushat dhe provoni perseri.", companyPanel: "Hyr ne panelin e kompanise", poweredBy: "Platforma PitlaneOne", legalNotice: "Njoftim ligjor", privacyPolicy: "Privatesia"
  },
  en: {
    automotiveService: "Automotive service", home: "Home", about: "About us", services: "Services", prices: "Prices", gallery: "Gallery", contact: "Contact", whatsapp: "WhatsApp", directions: "Directions", openMenu: "Open menu",
    heroEyebrow: "Professional workshop", heroTitle: "Reliable care for your vehicle", heroSubtitle: "Careful work, clear communication and a service history kept in order.", contactCta: "Contact us", servicesCta: "View services",
    trustOneTitle: "Documented work", trustOneBody: "A clear history is kept for every vehicle.", trustTwoTitle: "Timely care", trustTwoBody: "Services are planned around your needs.", trustThreeTitle: "Open communication", trustThreeBody: "Clear information before any work begins.",
    aboutEyebrow: "About the workshop", aboutTitle: "Professional care for every kilometre.", aboutBody: "We focus on precise work, transparency and a calm experience for every customer.", teamCta: "Talk to our team",
    servicesEyebrow: "What we offer", servicesTitle: "Services that keep your vehicle ready", servicesBody: "From the first check to completion, information stays clear and practical.", serviceOneTitle: "Accurate diagnostics", serviceOneBody: "A clear assessment of your vehicle and the recommended next steps.", serviceTwoTitle: "Scheduled maintenance", serviceTwoBody: "Planned services to keep your vehicle in good condition.", serviceThreeTitle: "Professional repairs", serviceThreeBody: "Documented work, clear communication and attention to detail.",
    catalogEyebrow: "Catalogue", catalogTitle: "Products and prices", catalogBody: "Clear prices for the products and services we offer.", service: "Service", product: "Product", offer: "Offer",
    galleryEyebrow: "Recent work", galleryTitle: "Workshop gallery", galleryAlt: "Work by", contactTitle: "Contact us about your vehicle", contactBody: "Contact our team for information, scheduling or a quick conversation.", contactPending: "Contact details will be published soon.", appointmentEyebrow: "Appointment request", appointmentTitle: "Send us your request", appointmentBody: "We will contact you to confirm a time. A request is not an automatic booking.", appointmentName: "Full name", appointmentPhone: "Phone number", appointmentService: "Requested service", appointmentChooseService: "Choose a service", appointmentDate: "Preferred date", appointmentTime: "Preferred time", appointmentNote: "Note (optional)", appointmentSubmit: "Send request", appointmentPending: "Sending...", appointmentSuccess: "Your request was sent. Our team will contact you to confirm.", appointmentError: "Your request was not sent. Check the fields and try again.", companyPanel: "Open company panel", poweredBy: "Powered by PitlaneOne", legalNotice: "Legal notice", privacyPolicy: "Privacy policy"
  },
  de: {
    automotiveService: "Kfz-Service", home: "Startseite", about: "Über uns", services: "Leistungen", prices: "Preise", gallery: "Galerie", contact: "Kontakt", whatsapp: "WhatsApp", directions: "Route planen", openMenu: "Menü öffnen",
    heroEyebrow: "Professioneller Autoservice", heroTitle: "Zuverlässige Pflege für Ihr Fahrzeug", heroSubtitle: "Sorgfältige Arbeit, klare Kommunikation und eine gepflegte Servicehistorie.", contactCta: "Kontakt aufnehmen", servicesCta: "Leistungen ansehen",
    trustOneTitle: "Dokumentierte Arbeit", trustOneBody: "Für jedes Fahrzeug bleibt die Historie nachvollziehbar.", trustTwoTitle: "Termingerechte Pflege", trustTwoBody: "Leistungen werden nach Ihrem Bedarf geplant.", trustThreeTitle: "Klare Kommunikation", trustThreeBody: "Verständliche Informationen vor jedem Auftrag.",
    aboutEyebrow: "Über die Werkstatt", aboutTitle: "Professionelle Pflege für jeden Kilometer.", aboutBody: "Wir stehen für präzise Arbeit, Transparenz und eine ruhige Erfahrung für jeden Kunden.", teamCta: "Mit unserem Team sprechen",
    servicesEyebrow: "Unser Angebot", servicesTitle: "Leistungen für ein zuverlässiges Fahrzeug", servicesBody: "Von der ersten Prüfung bis zum Abschluss bleiben alle Informationen klar und praktisch.", serviceOneTitle: "Präzise Diagnose", serviceOneBody: "Klare Einschätzung des Fahrzeugs und empfohlene nächste Schritte.", serviceTwoTitle: "Regelmäßige Wartung", serviceTwoBody: "Geplante Leistungen für einen guten Fahrzeugzustand.", serviceThreeTitle: "Professionelle Reparaturen", serviceThreeBody: "Dokumentierte Arbeit, klare Kommunikation und Liebe zum Detail.",
    catalogEyebrow: "Katalog", catalogTitle: "Produkte und Preise", catalogBody: "Klare Preise für unsere Produkte und Leistungen.", service: "Leistung", product: "Produkt", offer: "Angebot",
    galleryEyebrow: "Aktuelle Arbeiten", galleryTitle: "Galerie der Werkstatt", galleryAlt: "Arbeiten von", contactTitle: "Kontakt zu Ihrem Fahrzeug", contactBody: "Kontaktieren Sie unser Team für Informationen, Terminplanung oder ein kurzes Gespräch.", contactPending: "Kontaktdaten werden in Kürze veröffentlicht.", appointmentEyebrow: "Terminanfrage", appointmentTitle: "Senden Sie uns Ihre Anfrage", appointmentBody: "Wir melden uns zur Terminbestätigung. Eine Anfrage ist keine automatische Buchung.", appointmentName: "Vor- und Nachname", appointmentPhone: "Telefonnummer", appointmentService: "Gewünschte Leistung", appointmentChooseService: "Leistung auswählen", appointmentDate: "Wunschtermin", appointmentTime: "Wunschzeit", appointmentNote: "Notiz (optional)", appointmentSubmit: "Anfrage senden", appointmentPending: "Wird gesendet...", appointmentSuccess: "Ihre Anfrage wurde gesendet. Unser Team meldet sich zur Bestätigung.", appointmentError: "Die Anfrage wurde nicht gesendet. Prüfen Sie die Angaben und versuchen Sie es erneut.", companyPanel: "Zum Firmenbereich", poweredBy: "Mit PitlaneOne", legalNotice: "Impressum", privacyPolicy: "Datenschutz"
  },
  it: {
    automotiveService: "Servizio auto", home: "Home", about: "Chi siamo", services: "Servizi", prices: "Prezzi", gallery: "Galleria", contact: "Contatti", whatsapp: "WhatsApp", directions: "Indicazioni", openMenu: "Apri menu",
    heroEyebrow: "Autofficina professionale", heroTitle: "Cura affidabile per la tua auto", heroSubtitle: "Lavoro accurato, comunicazione chiara e storico degli interventi in ordine.", contactCta: "Contattaci", servicesCta: "Vedi servizi",
    trustOneTitle: "Lavoro documentato", trustOneBody: "Ogni veicolo mantiene uno storico chiaro.", trustTwoTitle: "Cura puntuale", trustTwoBody: "I servizi sono pianificati secondo le tue esigenze.", trustThreeTitle: "Comunicazione aperta", trustThreeBody: "Informazioni chiare prima di ogni intervento.",
    aboutEyebrow: "L'officina", aboutTitle: "Cura professionale per ogni chilometro.", aboutBody: "Ci concentriamo su lavoro preciso, trasparenza e un'esperienza serena per ogni cliente.", teamCta: "Parla con il nostro team",
    servicesEyebrow: "Cosa offriamo", servicesTitle: "Servizi che mantengono la tua auto efficiente", servicesBody: "Dal primo controllo alla consegna, le informazioni restano chiare e pratiche.", serviceOneTitle: "Diagnosi accurata", serviceOneBody: "Valutazione chiara del veicolo e prossimi passi consigliati.", serviceTwoTitle: "Manutenzione programmata", serviceTwoBody: "Interventi pianificati per mantenere l'auto in forma.", serviceThreeTitle: "Riparazioni professionali", serviceThreeBody: "Lavoro documentato, comunicazione chiara e attenzione ai dettagli.",
    catalogEyebrow: "Catalogo", catalogTitle: "Prodotti e prezzi", catalogBody: "Prezzi chiari per prodotti e servizi offerti.", service: "Servizio", product: "Prodotto", offer: "Offerta",
    galleryEyebrow: "Lavori recenti", galleryTitle: "Galleria dell'officina", galleryAlt: "Lavori di", contactTitle: "Contattaci per la tua auto", contactBody: "Contatta il nostro team per informazioni, appuntamenti o una breve conversazione.", contactPending: "I contatti saranno pubblicati a breve.", appointmentEyebrow: "Richiesta appuntamento", appointmentTitle: "Inviaci la tua richiesta", appointmentBody: "Ti contatteremo per confermare l'orario. La richiesta non è una prenotazione automatica.", appointmentName: "Nome e cognome", appointmentPhone: "Telefono", appointmentService: "Servizio richiesto", appointmentChooseService: "Scegli un servizio", appointmentDate: "Data preferita", appointmentTime: "Orario preferito", appointmentNote: "Nota (facoltativa)", appointmentSubmit: "Invia richiesta", appointmentPending: "Invio in corso...", appointmentSuccess: "La richiesta è stata inviata. Il nostro team ti contatterà per confermare.", appointmentError: "La richiesta non è stata inviata. Controlla i dati e riprova.", companyPanel: "Apri pannello aziendale", poweredBy: "Con PitlaneOne", legalNotice: "Note legali", privacyPolicy: "Privacy"
  },
  tr: {
    automotiveService: "Otomotiv servisi", home: "Ana sayfa", about: "Hakkımızda", services: "Hizmetler", prices: "Fiyatlar", gallery: "Galeri", contact: "İletişim", whatsapp: "WhatsApp", directions: "Yol tarifi", openMenu: "Menüyü aç",
    heroEyebrow: "Profesyonel oto servis", heroTitle: "Aracınız için güvenilir bakım", heroSubtitle: "Özenli işçilik, açık iletişim ve düzenli servis geçmişi.", contactCta: "İletişime geçin", servicesCta: "Hizmetleri görün",
    trustOneTitle: "Kayıtlı işçilik", trustOneBody: "Her araç için açık bir geçmiş tutulur.", trustTwoTitle: "Zamanında bakım", trustTwoBody: "Hizmetler ihtiyaçlarınıza göre planlanır.", trustThreeTitle: "Açık iletişim", trustThreeBody: "Her işlemden önce anlaşılır bilgi.",
    aboutEyebrow: "Servis hakkında", aboutTitle: "Her kilometre için profesyonel bakım.", aboutBody: "Her müşteri için hassas işçilik, şeffaflık ve sakin bir deneyime odaklanıyoruz.", teamCta: "Ekibimizle konuşun",
    servicesEyebrow: "Sunduğumuz hizmetler", servicesTitle: "Aracınızı hazır tutan hizmetler", servicesBody: "İlk kontrolden teslimata kadar bilgiler açık ve pratiktir.", serviceOneTitle: "Doğru arıza tespiti", serviceOneBody: "Araç durumu ve önerilen sonraki adımlar için net değerlendirme.", serviceTwoTitle: "Periyodik bakım", serviceTwoBody: "Aracınızı iyi durumda tutmak için planlı hizmetler.", serviceThreeTitle: "Profesyonel onarım", serviceThreeBody: "Kayıtlı işçilik, açık iletişim ve ayrıntılara özen.",
    catalogEyebrow: "Katalog", catalogTitle: "Ürünler ve fiyatlar", catalogBody: "Sunduğumuz ürün ve hizmetler için açık fiyatlar.", service: "Hizmet", product: "Ürün", offer: "Teklif",
    galleryEyebrow: "Son çalışmalar", galleryTitle: "Servis galerisi", galleryAlt: "Şirketten çalışmalar", contactTitle: "Aracınız için bize ulaşın", contactBody: "Bilgi, randevu veya kısa bir görüşme için ekibimize ulaşın.", contactPending: "İletişim bilgileri yakında yayınlanacaktır.", appointmentEyebrow: "Randevu talebi", appointmentTitle: "Talebinizi gönderin", appointmentBody: "Saati teyit etmek için sizinle iletişime geçeceğiz. Talep otomatik randevu değildir.", appointmentName: "Ad soyad", appointmentPhone: "Telefon", appointmentService: "İstenen hizmet", appointmentChooseService: "Bir hizmet seçin", appointmentDate: "Tercih edilen tarih", appointmentTime: "Tercih edilen saat", appointmentNote: "Not (isteğe bağlı)", appointmentSubmit: "Talep gönder", appointmentPending: "Gönderiliyor...", appointmentSuccess: "Talebiniz gönderildi. Ekibimiz onay için sizinle iletişime geçecek.", appointmentError: "Talep gönderilemedi. Bilgileri kontrol edip tekrar deneyin.", companyPanel: "Şirket panelini aç", poweredBy: "PitlaneOne ile", legalNotice: "Yasal bilgiler", privacyPolicy: "Gizlilik politikası"
  },
  pl: {
    automotiveService: "Serwis samochodowy", home: "Strona główna", about: "O nas", services: "Usługi", prices: "Cennik", gallery: "Galeria", contact: "Kontakt", whatsapp: "WhatsApp", directions: "Wyznacz trasę", openMenu: "Otwórz menu",
    heroEyebrow: "Profesjonalny serwis", heroTitle: "Pewna opieka nad Twoim autem", heroSubtitle: "Staranna praca, jasna komunikacja i uporządkowana historia serwisu.", contactCta: "Skontaktuj się", servicesCta: "Zobacz usługi",
    trustOneTitle: "Udokumentowana praca", trustOneBody: "Dla każdego auta prowadzona jest czytelna historia.", trustTwoTitle: "Terminowa obsługa", trustTwoBody: "Usługi są planowane zgodnie z Twoimi potrzebami.", trustThreeTitle: "Jasna komunikacja", trustThreeBody: "Zrozumiałe informacje przed każdą pracą.",
    aboutEyebrow: "O serwisie", aboutTitle: "Profesjonalna opieka na każdy kilometr.", aboutBody: "Stawiamy na precyzyjną pracę, przejrzystość i spokojną obsługę każdego klienta.", teamCta: "Porozmawiaj z naszym zespołem",
    servicesEyebrow: "Co oferujemy", servicesTitle: "Usługi, które utrzymują auto w formie", servicesBody: "Od pierwszej kontroli do zakończenia pracy informacje pozostają jasne i praktyczne.", serviceOneTitle: "Dokładna diagnostyka", serviceOneBody: "Jasna ocena stanu auta i zalecane kolejne kroki.", serviceTwoTitle: "Regularna obsługa", serviceTwoBody: "Planowane usługi utrzymujące auto w dobrym stanie.", serviceThreeTitle: "Profesjonalne naprawy", serviceThreeBody: "Udokumentowana praca, jasna komunikacja i dbałość o szczegóły.",
    catalogEyebrow: "Katalog", catalogTitle: "Produkty i ceny", catalogBody: "Jasne ceny produktów i usług, które oferujemy.", service: "Usługa", product: "Produkt", offer: "Oferta",
    galleryEyebrow: "Ostatnie realizacje", galleryTitle: "Galeria serwisu", galleryAlt: "Prace", contactTitle: "Skontaktuj się w sprawie auta", contactBody: "Skontaktuj się z naszym zespołem, aby uzyskać informacje lub umówić wizytę.", contactPending: "Dane kontaktowe zostaną opublikowane wkrótce.", appointmentEyebrow: "Prośba o termin", appointmentTitle: "Wyślij nam swoją prośbę", appointmentBody: "Skontaktujemy się, aby potwierdzić termin. Prośba nie jest automatyczną rezerwacją.", appointmentName: "Imię i nazwisko", appointmentPhone: "Telefon", appointmentService: "Wybrana usługa", appointmentChooseService: "Wybierz usługę", appointmentDate: "Preferowana data", appointmentTime: "Preferowana godzina", appointmentNote: "Notatka (opcjonalnie)", appointmentSubmit: "Wyślij prośbę", appointmentPending: "Wysyłanie...", appointmentSuccess: "Prośba została wysłana. Nasz zespół skontaktuje się w celu potwierdzenia.", appointmentError: "Prośba nie została wysłana. Sprawdź dane i spróbuj ponownie.", companyPanel: "Otwórz panel firmy", poweredBy: "Z PitlaneOne", legalNotice: "Informacje prawne", privacyPolicy: "Polityka prywatności"
  }
};
