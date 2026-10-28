import Link from "next/link";
import type { Route } from "next";
import {
  CalendarCheck2,
  CalendarClock,
  Check,
  ChevronDown,
  MessageCircle,
  Phone,
  Wrench,
  X,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import {
  cancelCompanyAppointmentRequest,
  updateCompanyAppointmentRequest,
  openCompanyAppointmentWorkTicket,
} from "@/app/saas-actions";
import { AppointmentSlotPicker } from "@/components/appointment-slot-picker";
import { AppointmentBusinessHoursEditor } from "@/components/appointment-business-hours-editor";
import { CopyTextButton } from "@/components/copy-text-button";
import {
  canManageCompany,
  canManageCompanyOperations,
  requireCompanyContext,
  requireSaasUser,
} from "@/lib/company";
import { appLocaleFormats, toAppLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

type RequestStatus = "requested" | "awaiting_customer" | "declined";

function requestedStatus(value: string | undefined): RequestStatus | undefined {
  return value === "requested" ||
    value === "awaiting_customer" ||
    value === "declined"
    ? value
    : undefined;
}

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default async function CompanyAppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{
    status?: string;
    saved?: string;
    proposal?: string;
    error?: string;
  }>;
}) {
  const { companyId } = await params;
  const query = await searchParams;
  const activeStatus = requestedStatus(query.status);
  const context = await requireCompanyContext(companyId);
  const canOperate = canManageCompanyOperations(context.role);
  const canManageHours = canManageCompany(context.role);
  const t = await getTranslations("appointments");
  const appLocale = toAppLocale(await getLocale());
  const ticketLabels = {
    sq: { vehicle: "Automjeti", plate: "Targa" },
    en: { vehicle: "Vehicle", plate: "License plate" },
    de: { vehicle: "Fahrzeug", plate: "Kennzeichen" },
    it: { vehicle: "Veicolo", plate: "Targa" },
    pl: { vehicle: "Pojazd", plate: "Tablica rejestracyjna" },
    tr: { vehicle: "Araç", plate: "Plaka" },
  }[appLocale];
  const arrivalCopy = {
    sq: {
      title: "Mbërritjet e sotme",
      description:
        "Plotëso automjetin dhe hape punën vetëm kur klienti mbërrin.",
      open: "Hap punën",
    },
    en: {
      title: "Today's arrivals",
      description:
        "Complete the vehicle details and open the work only when the customer arrives.",
      open: "Open work",
    },
    de: {
      title: "Heutige Ankünfte",
      description:
        "Fahrzeugdaten ergänzen und den Auftrag erst bei Ankunft öffnen.",
      open: "Auftrag öffnen",
    },
    it: {
      title: "Arrivi di oggi",
      description:
        "Completa i dati del veicolo e apri il lavoro solo all'arrivo del cliente.",
      open: "Apri lavoro",
    },
    pl: {
      title: "Dzisiejsze przyjazdy",
      description:
        "Uzupełnij dane pojazdu i otwórz zlecenie dopiero po przyjeździe klienta.",
      open: "Otwórz zlecenie",
    },
    tr: {
      title: "Bugünkü gelişler",
      description:
        "Araç bilgilerini tamamlayın ve işi müşteri geldiğinde açın.",
      open: "İşi aç",
    },
  }[appLocale];
  const cancellationCopy = {
    sq: "Anulo termin",
    en: "Cancel appointment",
    de: "Termin absagen",
    it: "Annulla appuntamento",
    pl: "Anuluj termin",
    tr: "Randevuyu iptal et",
  }[appLocale];

  if (!canOperate) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-900">
          {t("noAccess")}
        </p>
      </main>
    );
  }

  const { supabase } = await requireSaasUser();
  // This is intentionally opportunistic. The authenticated page creates any
  // arrival tickets already due; production polling is documented separately.
  await supabase.rpc("materialize_due_appointment_work_tickets");
  const requestQuery = supabase
    .from("company_appointment_requests")
    .select(
      "id, customer_name, phone, service_interest, service_price, service_currency, preferred_date, preferred_time, scheduled_start, duration_minutes, note, status, created_at, handled_at, customer_response_token, customer_response_expires_at",
    )
    .eq("company_id", context.company.id)
    .in("status", ["requested", "awaiting_customer", "declined"]);
  const availabilityTo = new Date();
  availabilityTo.setDate(availabilityTo.getDate() + 90);
  const [
    { data: requests, error },
    { data: calendarItems, error: calendarError },
    { count: pendingCount },
    { data: businessHours, error: hoursError },
    { data: reservedSlots, error: reservedSlotsError },
    { data: arrivalTickets, error: arrivalTicketsError },
  ] = await Promise.all([
    requestQuery.order("created_at", { ascending: false }).limit(100),
    supabase
      .from("company_appointment_requests")
      .select(
        "id, customer_name, service_interest, phone, scheduled_start, duration_minutes",
      )
      .eq("company_id", context.company.id)
      .eq("status", "confirmed")
      .not("scheduled_start", "is", null)
      .gte("scheduled_start", `${localToday()} 00:00:00`)
      .order("scheduled_start")
      .limit(100),
    supabase
      .from("company_appointment_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", context.company.id)
      .in("status", ["requested", "awaiting_customer"]),
    supabase
      .from("company_appointment_business_hours")
      .select("weekday, is_open, opens_at, closes_at, slot_minutes")
      .eq("company_id", context.company.id)
      .order("weekday"),
    supabase.rpc("list_public_appointment_slots", {
      input_company_id: context.company.id,
      input_from: localToday(),
      input_to: availabilityTo.toISOString().slice(0, 10),
    }),
    supabase
      .from("company_appointment_work_tickets")
      .select(
        "id, customer_name, phone, vehicle_description, vehicle_plate, service_interest, note, scheduled_start",
      )
      .eq("company_id", context.company.id)
      .eq("status", "ready")
      .order("scheduled_start")
      .limit(24),
  ]);
  if (
    error ||
    calendarError ||
    hoursError ||
    reservedSlotsError ||
    arrivalTicketsError
  )
    throw new Error("Appointment requests could not be loaded.");

  const locale = appLocaleFormats[appLocale];
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : "http://localhost:3011";
  const dateTime = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dateOnly = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const statusHref = (status?: RequestStatus) =>
    `/app/${companyId}/appointments${status ? `?status=${status}` : ""}#appointment-inbox` as Route;
  const weekdayLabel = (weekday: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
      new Date(2026, 7, 2 + weekday),
    );
  const statusOrder: Record<RequestStatus, number> = {
    requested: 0,
    awaiting_customer: 1,
    declined: 2,
  };
  const allRequests = requests ?? [];
  const requestCounts = {
    all: allRequests.length,
    requested: allRequests.filter((request) => request.status === "requested").length,
    awaiting_customer: allRequests.filter(
      (request) => request.status === "awaiting_customer",
    ).length,
    declined: allRequests.filter((request) => request.status === "declined").length,
  };
  const visibleRequests = activeStatus
    ? allRequests.filter((request) => request.status === activeStatus)
    : allRequests;
  const sortedRequests = [...visibleRequests].sort((left, right) => {
    const priority =
      statusOrder[left.status as RequestStatus] -
      statusOrder[right.status as RequestStatus];
    return (
      priority ||
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  });

  const scheduleForm = (
    request: NonNullable<typeof requests>[number],
    compact = false,
  ) => (
    <form
      action={updateCompanyAppointmentRequest}
      className="grid gap-x-4 gap-y-3 sm:grid-cols-2"
    >
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="requestId" value={request.id} />
      <input type="hidden" name="intent" value="schedule" />
      <AppointmentSlotPicker
        bookedSlots={
          (reservedSlots ?? []) as {
            scheduled_date: string;
            scheduled_time: string;
            duration_minutes: number;
          }[]
        }
        businessHours={businessHours ?? []}
        dateName="scheduledDate"
        timeName="scheduledTime"
        durationName="durationMinutes"
        initialDuration={request.duration_minutes}
        initialDate={
          request.scheduled_start?.slice(0, 10) ??
          request.preferred_date ??
          localToday()
        }
        initialTime={
          request.scheduled_start?.slice(11, 16) ??
          request.preferred_time?.slice(0, 5)
        }
        dateLabel={t("scheduleDate")}
        timeLabel={t("scheduleTime")}
        durationLabel={t("duration")}
        minuteLabel={t("minutes")}
        minimal
      />
      <button className="inline-flex h-9 items-center justify-center gap-1.5 self-end rounded-lg bg-emerald-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700">
        <Check className="h-3.5 w-3.5" />
        {compact ? t("updateProposal") : t("reviewAndSchedule")}
      </button>
    </form>
  );

  const declineForm = (requestId: string) => (
    <form action={updateCompanyAppointmentRequest}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="intent" value="decline" />
      <button className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-rose-700">
        <X className="h-4 w-4" />
        {t("decline")}
      </button>
    </form>
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      <header className="order-1 border-b border-slate-200 pb-5">
        <Link
          href={`/app/${companyId}` as Route}
          className="text-xs font-bold text-slate-500 transition hover:text-brand"
        >
          ← {t("back")}
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {t("title")}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-900">
                <CalendarClock className="h-3.5 w-3.5" />
                {pendingCount ?? 0} {t("openRequests")}
              </span>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
              {t("description")}
            </p>
          </div>
          <div className="flex gap-2 text-xs font-bold text-slate-600">
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <strong className="mr-1 text-slate-950">
                {calendarItems?.length ?? 0}
              </strong>
              {t("scheduled")}
            </span>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <strong className="mr-1 text-slate-950">
                {allRequests.length}
              </strong>
              {t("all")}
            </span>
          </div>
        </div>
      </header>

      {query.saved ? (
        <p className="order-2 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {t("saved")}
        </p>
      ) : null}
      {query.proposal ? (
        <p className="order-2 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {t("proposalSaved")}
        </p>
      ) : null}
      {query.error ? (
        <p className="order-2 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          {t("error")}
        </p>
      ) : null}

      {arrivalTickets?.length ? (
        <section className="order-3 mt-5 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                <Wrench className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-950">
                  {arrivalCopy.title}
                </p>
                <p className="text-xs font-semibold text-slate-600">
                  {arrivalCopy.description}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
              {arrivalTickets.length}
            </span>
          </div>
          <ul className="grid gap-px bg-amber-100 sm:grid-cols-2 xl:grid-cols-3">
            {arrivalTickets.map((ticket) => (
              <li
                id={`work-ticket-${ticket.id}`}
                key={ticket.id}
                className="scroll-mt-28 bg-white p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {ticket.customer_name}
                    </p>
                    <a
                      href={`tel:${ticket.phone.replace(/\s/g, "")}`}
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-brand"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {ticket.phone}
                    </a>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-slate-500">
                    {dateTime.format(new Date(ticket.scheduled_start))}
                  </span>
                </div>
                <p className="mt-2 truncate text-xs font-bold text-slate-700">
                  {ticket.service_interest}
                </p>
                <form
                  action={openCompanyAppointmentWorkTicket}
                  className="mt-3 grid gap-2 sm:grid-cols-2"
                >
                  <input type="hidden" name="companyId" value={companyId} />
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <label className="min-w-0 text-[10px] font-black uppercase tracking-[.12em] text-slate-500">
                    {ticketLabels.vehicle}
                    <input
                      name="vehicleDescription"
                      required
                      defaultValue={ticket.vehicle_description ?? ""}
                      placeholder="z. B. VW Golf VII"
                      className="mt-1 block w-full !rounded-md !px-2.5 !py-2 text-sm normal-case tracking-normal"
                    />
                  </label>
                  <label className="min-w-0 text-[10px] font-black uppercase tracking-[.12em] text-slate-500">
                    {ticketLabels.plate}
                    <input
                      name="vehiclePlate"
                      required
                      defaultValue={ticket.vehicle_plate ?? ""}
                      placeholder="MS-AB 123"
                      className="mt-1 block w-full !rounded-md !px-2.5 !py-2 text-sm normal-case tracking-normal"
                    />
                  </label>
                  <button className="sm:col-span-2 inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800">
                    {arrivalCopy.open}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canManageHours ? (
        <AppointmentBusinessHoursEditor
          companyId={companyId}
          hours={businessHours ?? []}
          weekdayLabels={Array.from({ length: 7 }, (_, weekday) =>
            weekdayLabel(weekday),
          )}
          labels={{
            availability: t("availability"),
            weeklyHours: t("weeklyHours"),
            edit: t("edit"),
            close: t("close"),
            open: t("open"),
            from: t("from"),
            until: t("until"),
            slotInterval: t("slotInterval"),
            saveHours: t("saveHours"),
            minutes: t("minutes"),
          }}
        />
      ) : null}

      <section className="order-6 mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
            <CalendarCheck2 className="h-4 w-4 text-brand" />
            {t("scheduled")}
          </h2>
          <span className="text-xs font-bold text-slate-500">
            {calendarItems?.length ?? 0}
          </span>
        </div>
        {calendarItems?.length ? (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {calendarItems.map((item) => {
              const scheduled = new Date(item.scheduled_start!);
              const whatsappHref = `https://wa.me/${item.phone.replace(/\D/g, "")}?text=${encodeURIComponent(t("whatsappConfirmed", { name: item.customer_name, company: context.company.name, date: dateOnly.format(scheduled), time: item.scheduled_start?.slice(11, 16) ?? "" }))}`;
              return (
                <article
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-3 shadow-sm"
                >
                  <p className="text-xs font-bold text-slate-600">
                    {dateTime.format(new Date(item.scheduled_start!))} ·{" "}
                    {item.duration_minutes} min
                  </p>
                  <p className="mt-1.5 truncate text-sm font-black text-slate-800">
                    {item.customer_name}
                  </p>
                  <p className="truncate text-xs text-slate-600">
                    {item.service_interest}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <a
                      href={`tel:${item.phone.replace(/\s/g, "")}`}
                      className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs font-bold text-brand hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {item.phone}
                    </a>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#128c7e] transition hover:text-[#075e54]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {t("notifyWhatsApp")}
                    </a>
                    <form action={cancelCompanyAppointmentRequest}>
                      <input type="hidden" name="companyId" value={companyId} />
                      <input type="hidden" name="requestId" value={item.id} />
                      <button
                        type="submit"
                        data-testid="appointment-cancel"
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-slate-500 transition hover:text-rose-700"
                      >
                        <X className="h-3.5 w-3.5" />
                        {cancellationCopy}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-sm font-semibold text-slate-500">
            {t("emptyCalendar")}
          </p>
        )}
      </section>

      <section
        id="appointment-inbox"
        className="order-4 mt-7 scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.16em] text-brand">
              {t("openRequests")}
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{t("title")}</h2>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
            {pendingCount ?? 0} {t("openRequests")}
          </span>
        </div>
        <nav
          className="flex gap-2 overflow-x-auto px-5 py-3 sm:px-6"
          aria-label={t("title")}
        >
          {([
            [undefined, "all"],
            ["requested", "requested"],
            ["awaiting_customer", "awaiting_customer"],
            ["declined", "declined"],
          ] as const).map(([status, countKey]) => (
            <Link
              key={status ?? "all"}
              href={statusHref(status)}
              aria-current={
                activeStatus === status || (!activeStatus && !status)
                  ? "page"
                  : undefined
              }
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition ${activeStatus === status || (!activeStatus && !status) ? "border-slate-950 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}
            >
              {status ? t(status as RequestStatus) : t("all")}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeStatus === status || (!activeStatus && !status) ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
                {requestCounts[countKey]}
              </span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="order-5 mt-4">
        {sortedRequests.length ? (
          <ul className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {sortedRequests.map((request) => {
              const status = request.status as RequestStatus;
              const statusClass =
                status === "requested"
                  ? "bg-amber-50 text-amber-800"
                  : status === "awaiting_customer"
                    ? "bg-sky-50 text-sky-800"
                    : "bg-slate-100 text-slate-700";
              const proposalDate = request.scheduled_start
                ? dateOnly.format(new Date(request.scheduled_start))
                : "";
              const proposalTime = request.scheduled_start?.slice(11, 16) ?? "";
              const servicePrice =
                request.service_price !== null && request.service_currency
                  ? new Intl.NumberFormat(appLocaleFormats[appLocale], {
                      style: "currency",
                      currency: request.service_currency,
                      maximumFractionDigits: 2,
                    }).format(Number(request.service_price))
                  : null;
              const serviceDetails = [
                request.service_interest,
                `${request.duration_minutes} ${t("minutes")}`,
                servicePrice,
              ]
                .filter(Boolean)
                .join(" · ");
              const whatsappKey =
                status === "awaiting_customer"
                  ? "whatsappProposal"
                  : "whatsappDeclined";
              const approvalUrl = request.customer_response_token
                ? `${appBaseUrl}/appointment-response/${request.customer_response_token}`
                : "";
              const whatsappMessage = t(whatsappKey, {
                name: request.customer_name,
                company: context.company.name,
                date: proposalDate,
                time: proposalTime,
                details: serviceDetails,
                approvalUrl,
              });
              const whatsappHref = `https://wa.me/${request.phone.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;

              return (
                <li
                  id={`request-${request.id}`}
                  key={request.id}
                  className={`scroll-mt-28 overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${status === "requested" ? "border-amber-200" : status === "awaiting_customer" ? "border-sky-200" : "border-slate-200"}`}
                >
                  <div className={`h-1.5 ${status === "requested" ? "bg-amber-400" : status === "awaiting_customer" ? "bg-sky-400" : "bg-slate-300"}`} />
                  <div className="min-w-0 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-black text-slate-950">
                          {request.customer_name}
                        </h2>
                        <a
                          href={`tel:${request.phone.replace(/\s/g, "")}`}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-brand"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {request.phone}
                        </a>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${statusClass}`}
                      >
                        {t(status)}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-black text-slate-900">
                      {request.service_interest} · {request.duration_minutes}{" "}
                      {t("minutes")}
                      {servicePrice ? ` · ${servicePrice}` : ""}
                    </p>
                    {request.preferred_date ? (
                      <p className="mt-1 text-xs text-slate-600">
                        {t("preferredDate")}:{" "}
                        <strong>
                          {dateOnly.format(
                            new Date(`${request.preferred_date}T12:00:00`),
                          )}
                          {request.preferred_time
                            ? ` · ${request.preferred_time.slice(0, 5)}`
                            : ""}
                        </strong>
                      </p>
                    ) : null}
                    {request.scheduled_start ? (
                      <p className="mt-1.5 text-xs font-bold text-slate-600">
                        {t(
                          status === "awaiting_customer"
                            ? "proposedTime"
                            : "scheduled",
                        )}
                        : {dateTime.format(new Date(request.scheduled_start))}
                      </p>
                    ) : null}
                    {request.note ? (
                      <details className="mt-2.5 text-xs">
                        <summary className="cursor-pointer font-bold text-slate-600">
                          {t("note")}
                        </summary>
                        <p className="mt-2 leading-5 text-slate-700">
                          {request.note}
                        </p>
                      </details>
                    ) : null}
                    <p className="mt-2.5 text-[10px] font-semibold text-slate-400">
                      {t("submitted")}:{" "}
                      {dateTime.format(new Date(request.created_at))}
                    </p>
                  </div>
                  {status === "requested" ? (
                    <details className="group border-t border-amber-100 bg-amber-50/40">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-black text-slate-900 transition hover:bg-amber-50 sm:px-5">
                        <span>{t("reviewAndSchedule")}</span>
                        <ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-slate-100 p-3.5">
                        <p className="mb-3 text-xs font-semibold leading-5 text-slate-600">
                          {t("schedulingRule")}
                        </p>
                        {scheduleForm(request)}
                        <div className="mt-3">{declineForm(request.id)}</div>
                      </div>
                    </details>
                  ) : null}
                  {status === "awaiting_customer" ? (
                    <div className="border-t border-sky-100 bg-sky-50/50 p-4">
                      <p className="text-xs font-semibold leading-5 text-sky-950">
                        {t("awaitingInstructions")}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2.5 text-sm font-black text-slate-950 transition hover:brightness-95"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {t("sendProposalWhatsApp")}
                        </a>
                        {approvalUrl ? (
                          <CopyTextButton
                            value={approvalUrl}
                            label={t("copyProposalLink")}
                            copiedLabel={t("proposalLinkCopied")}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2.5 text-sm font-black text-sky-950 transition hover:bg-sky-50"
                          />
                        ) : null}
                        <form action={updateCompanyAppointmentRequest}>
                          <input
                            type="hidden"
                            name="companyId"
                            value={companyId}
                          />
                          <input
                            type="hidden"
                            name="requestId"
                            value={request.id}
                          />
                          <input
                            type="hidden"
                            name="intent"
                            value="customer_accepted"
                          />
                          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-sm font-black text-white">
                            <Check className="h-4 w-4" />
                            {t("customerAccepted")}
                          </button>
                        </form>
                      </div>
                      <details className="mt-3 border-t border-sky-100 pt-3">
                        <summary className="cursor-pointer text-sm font-bold text-sky-900">
                          {t("changeProposal")}
                        </summary>
                        <div className="mt-3">
                          {scheduleForm(request, true)}
                        </div>
                      </details>
                      <div className="mt-3">{declineForm(request.id)}</div>
                    </div>
                  ) : null}
                  {status === "declined" ? (
                    <div className="border-t border-slate-100 px-4 py-3">
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 hover:text-emerald-800"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t("notifyWhatsApp")}
                      </a>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <CalendarClock className="mx-auto h-7 w-7 text-slate-400" />
            <p className="mt-3 font-bold text-slate-700">{t("empty")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
