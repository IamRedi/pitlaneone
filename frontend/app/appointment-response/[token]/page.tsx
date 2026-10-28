import { CalendarCheck2, CalendarX2, Clock3 } from "lucide-react";

import { respondToAppointmentProposal } from "@/app/appointment-response/[token]/actions";
import { appLocaleFormats, type AppLocale, toAppLocale } from "@/i18n/config";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PublicAppointmentProposal = {
  company_name: string;
  duration_minutes: number;
  scheduled_start: string;
  service_currency: string | null;
  service_interest: string;
  service_price: number | null;
  status: "awaiting_customer" | "confirmed";
  website_locale: string;
};

type Copy = {
  eyebrow: string; title: string; description: string; service: string;
  duration: string; price: string; appointment: string; accept: string;
  decline: string; cancel: string; accepted: string; declined: string;
  cancelled: string; confirmed: string; error: string; unavailable: string; close: string;
};

const copy: Record<AppLocale, Copy> = {
  en: { eyebrow: "Appointment proposal", title: "Does this time work for you?", description: "Check the details and respond directly. The business sees your answer immediately.", service: "Service", duration: "Duration", price: "Price", appointment: "Proposed time", accept: "Accept appointment", decline: "Request another time", cancel: "Cancel appointment", accepted: "Your appointment is confirmed.", declined: "Your response was sent. The business can propose another time.", cancelled: "Your appointment was cancelled.", confirmed: "Your appointment is confirmed.", error: "Your response could not be sent. Please try again.", unavailable: "This proposal is no longer available or has expired.", close: "You can close this page." },
  de: { eyebrow: "Terminvorschlag", title: "Passt dieser Termin für Sie?", description: "Prüfen Sie die Details und antworten Sie direkt. Der Betrieb sieht Ihre Antwort sofort.", service: "Leistung", duration: "Dauer", price: "Preis", appointment: "Vorgeschlagener Termin", accept: "Termin bestätigen", decline: "Andere Zeit anfragen", cancel: "Termin absagen", accepted: "Ihr Termin ist bestätigt.", declined: "Ihre Antwort wurde gesendet. Der Betrieb kann eine andere Zeit vorschlagen.", cancelled: "Ihr Termin wurde abgesagt.", confirmed: "Ihr Termin ist bestätigt.", error: "Ihre Antwort konnte nicht gesendet werden. Bitte versuchen Sie es erneut.", unavailable: "Dieser Vorschlag ist nicht mehr verfügbar oder abgelaufen.", close: "Sie können diese Seite schließen." },
  sq: { eyebrow: "Propozimi i terminit", title: "A ju përshtatet ky termin?", description: "Kontrolloni detajet dhe përgjigjuni direkt. Biznesi e sheh menjëherë përgjigjen tuaj.", service: "Shërbimi", duration: "Kohëzgjatja", price: "Çmimi", appointment: "Termini i propozuar", accept: "Konfirmo terminin", decline: "Kërko një orar tjetër", cancel: "Anulo terminin", accepted: "Termini juaj u konfirmua.", declined: "Përgjigjja u dërgua. Biznesi mund të propozojë një orar tjetër.", cancelled: "Termini juaj u anulua.", confirmed: "Termini juaj është i konfirmuar.", error: "Përgjigjja nuk u dërgua. Ju lutemi provoni përsëri.", unavailable: "Ky propozim nuk është më i disponueshëm ose ka skaduar.", close: "Mund ta mbyllni këtë faqe." },
  it: { eyebrow: "Proposta di appuntamento", title: "Questo orario va bene per te?", description: "Controlla i dettagli e rispondi direttamente. L'attività vedrà subito la risposta.", service: "Servizio", duration: "Durata", price: "Prezzo", appointment: "Orario proposto", accept: "Conferma appuntamento", decline: "Richiedi un altro orario", cancel: "Annulla appuntamento", accepted: "Il tuo appuntamento è confermato.", declined: "La risposta è stata inviata. L'attività può proporre un altro orario.", cancelled: "Il tuo appuntamento è stato annullato.", confirmed: "Il tuo appuntamento è confermato.", error: "Non è stato possibile inviare la risposta. Riprova.", unavailable: "Questa proposta non è più disponibile o è scaduta.", close: "Puoi chiudere questa pagina." },
  tr: { eyebrow: "Randevu önerisi", title: "Bu saat size uygun mu?", description: "Ayrıntıları kontrol edip doğrudan yanıtlayın. İşletme yanıtınızı hemen görür.", service: "Hizmet", duration: "Süre", price: "Fiyat", appointment: "Önerilen saat", accept: "Randevuyu onayla", decline: "Başka saat iste", cancel: "Randevuyu iptal et", accepted: "Randevunuz onaylandı.", declined: "Yanıtınız gönderildi. İşletme başka bir saat önerebilir.", cancelled: "Randevunuz iptal edildi.", confirmed: "Randevunuz onaylandı.", error: "Yanıtınız gönderilemedi. Lütfen tekrar deneyin.", unavailable: "Bu öneri artık kullanılamıyor veya süresi doldu.", close: "Bu sayfayı kapatabilirsiniz." },
  pl: { eyebrow: "Propozycja terminu", title: "Czy ten termin Ci odpowiada?", description: "Sprawdź szczegóły i odpowiedz bezpośrednio. Firma natychmiast zobaczy odpowiedź.", service: "Usługa", duration: "Czas", price: "Cena", appointment: "Proponowany termin", accept: "Potwierdź termin", decline: "Poproś o inny termin", cancel: "Anuluj termin", accepted: "Twój termin został potwierdzony.", declined: "Odpowiedź została wysłana. Firma może zaproponować inny termin.", cancelled: "Twój termin został anulowany.", confirmed: "Twój termin został potwierdzony.", error: "Nie udało się wysłać odpowiedzi. Spróbuj ponownie.", unavailable: "Ta propozycja nie jest już dostępna lub wygasła.", close: "Możesz zamknąć tę stronę." },
};

function Outcome({ text, success, close }: { text: string; success: boolean; close: string }) {
  const Icon = success ? CalendarCheck2 : CalendarX2;
  return <main className="grid min-h-screen place-items-center bg-[#f4f0e8] px-5 py-12 text-slate-950"><section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-12"><Icon className={`mx-auto h-12 w-12 ${success ? "text-emerald-600" : "text-amber-600"}`} /><h1 className="mt-6 text-3xl font-black tracking-tight">{text}</h1><p className="mt-4 text-slate-600">{close}</p></section></main>;
}

export default async function AppointmentResponsePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ result?: string; locale?: string }> }) {
  const { token } = await params;
  const { result, locale: resultLocale } = await searchParams;
  const supabase = await createServerSupabase();
  const { data: rawData } = await supabase.rpc("get_public_appointment_proposal", { input_token: token }).maybeSingle();
  const data = rawData as PublicAppointmentProposal | null;
  const locale = toAppLocale(data?.website_locale ?? resultLocale);
  const t = copy[locale];

  if (result === "accepted") return <Outcome text={t.accepted} success close={t.close} />;
  if (result === "declined") return <Outcome text={t.declined} success={false} close={t.close} />;
  if (result === "cancelled") return <Outcome text={t.cancelled} success={false} close={t.close} />;
  if (result === "error") return <Outcome text={t.error} success={false} close={t.close} />;
  if (!data) return <Outcome text={t.unavailable} success={false} close={t.close} />;

  const isConfirmed = data.status === "confirmed";
  const dateTime = new Intl.DateTimeFormat(appLocaleFormats[locale], { dateStyle: "full", timeStyle: "short" }).format(new Date(data.scheduled_start));
  const price = data.service_price !== null && data.service_currency ? new Intl.NumberFormat(appLocaleFormats[locale], { style: "currency", currency: data.service_currency, maximumFractionDigits: 2 }).format(Number(data.service_price)) : null;

  return <main className="grid min-h-screen place-items-center bg-[#f4f0e8] px-5 py-12 text-slate-950"><section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl"><header className="bg-slate-950 p-7 text-white sm:p-10"><p className="text-xs font-black uppercase tracking-[.2em] text-amber-400">{t.eyebrow}</p><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{isConfirmed ? t.confirmed : t.title}</h1><p className="mt-4 max-w-xl leading-7 text-slate-300">{isConfirmed ? t.close : t.description}</p></header><div className="p-7 sm:p-10"><h2 className="text-xl font-black">{data.company_name}</h2><dl className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2"><div><dt className="text-xs font-black uppercase tracking-wide text-slate-500">{t.service}</dt><dd className="mt-1 font-bold">{data.service_interest}</dd></div><div><dt className="text-xs font-black uppercase tracking-wide text-slate-500">{t.duration}</dt><dd className="mt-1 font-bold">{data.duration_minutes} min</dd></div>{price ? <div><dt className="text-xs font-black uppercase tracking-wide text-slate-500">{t.price}</dt><dd className="mt-1 font-bold">{price}</dd></div> : null}<div><dt className="text-xs font-black uppercase tracking-wide text-slate-500">{t.appointment}</dt><dd className="mt-1 flex items-center gap-2 font-bold"><Clock3 className="h-4 w-4 text-amber-600" />{dateTime}</dd></div></dl><div className="mt-7 grid gap-3 sm:grid-cols-2">{isConfirmed ? <form action={respondToAppointmentProposal}><input type="hidden" name="token" value={token} /><input type="hidden" name="response" value="cancelled" /><button className="w-full rounded-xl border border-rose-200 bg-rose-50 px-5 py-3.5 font-black text-rose-700 hover:bg-rose-100">{t.cancel}</button></form> : <><form action={respondToAppointmentProposal}><input type="hidden" name="token" value={token} /><input type="hidden" name="response" value="accepted" /><button className="w-full rounded-xl bg-emerald-600 px-5 py-3.5 font-black text-white hover:bg-emerald-700">{t.accept}</button></form><form action={respondToAppointmentProposal}><input type="hidden" name="token" value={token} /><input type="hidden" name="response" value="declined" /><button className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3.5 font-black text-slate-800 hover:bg-slate-50">{t.decline}</button></form></>}</div></div></section></main>;
}
