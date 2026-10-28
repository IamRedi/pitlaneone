"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Pencil, X } from "lucide-react";
import { updateCompanyAppointmentBusinessHours } from "@/app/saas-actions";
import { SubmitButton } from "@/components/forms";

type BusinessHour = {
  weekday: number;
  is_open: boolean;
  opens_at: string;
  closes_at: string;
  slot_minutes: number;
};

type Labels = {
  availability: string;
  weeklyHours: string;
  edit: string;
  close: string;
  open: string;
  from: string;
  until: string;
  slotInterval: string;
  saveHours: string;
  minutes: string;
};

export function AppointmentBusinessHoursEditor({
  companyId,
  hours,
  weekdayLabels,
  labels,
}: {
  companyId: string;
  hours: BusinessHour[];
  weekdayLabels: string[];
  labels: Labels;
}) {
  const hoursByWeekday = new Map(hours.map((row) => [row.weekday, row]));
  const initialRows = Array.from({ length: 7 }, (_, weekday) => {
    const row = hoursByWeekday.get(weekday);
    return {
      weekday,
      isOpen: row?.is_open ?? (weekday >= 1 && weekday <= 5),
      opensAt: row?.opens_at.slice(0, 5) ?? "08:00",
      closesAt: row?.closes_at.slice(0, 5) ?? "18:00",
      slotMinutes: row?.slot_minutes ?? 30,
    };
  });
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState(false);
  const openDays = rows.filter((row) => row.isOpen).length;

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#appointment-hours") setEditing(true);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const updateRow = (
    weekday: number,
    update: Partial<(typeof rows)[number]>,
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.weekday === weekday ? { ...row, ...update } : row,
      ),
    );
  };

  return (
    <section
      id="appointment-hours"
      className="order-7 mt-8 scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.16em] text-brand">
              {labels.availability}
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-950">
              {labels.weeklyHours}
            </h2>
            <p className="mt-0.5 text-xs font-bold text-slate-500">
              {openDays} {labels.open.toLocaleLowerCase()}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          aria-expanded={editing}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${editing ? "border border-slate-200 text-slate-700" : "bg-slate-950 text-white hover:bg-brand"}`}
        >
          {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          {editing ? labels.close : labels.edit}
        </button>
      </header>

      {!editing ? (
        <div className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-4 lg:grid-cols-7 sm:p-6">
          {rows.map((row) => (
            <div
              key={row.weekday}
              className={`rounded-xl border p-3 ${row.isOpen ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
            >
              <p className="truncate text-xs font-black capitalize text-slate-800">
                {weekdayLabels[row.weekday]}
              </p>
              <p className={`mt-2 text-xs font-bold ${row.isOpen ? "text-emerald-700" : "text-slate-400"}`}>
                {row.isOpen ? `${row.opensAt}–${row.closesAt}` : "—"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <form
          action={updateCompanyAppointmentBusinessHours}
          className="p-5 sm:p-6"
        >
          <input type="hidden" name="companyId" value={companyId} />
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((row) => (
              <article
                key={row.weekday}
                className={`rounded-xl border p-4 transition ${row.isOpen ? "border-brand/25 bg-brand/[.035]" : "border-slate-200 bg-slate-50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock3 className={`h-4 w-4 ${row.isOpen ? "text-brand" : "text-slate-400"}`} />
                    <h3 className="text-sm font-black capitalize text-slate-900">
                      {weekdayLabels[row.weekday]}
                    </h3>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-black text-slate-600">
                    {labels.open}
                    <input
                      name={`open-${row.weekday}`}
                      type="checkbox"
                      checked={row.isOpen}
                      onChange={(event) =>
                        updateRow(row.weekday, { isOpen: event.target.checked })
                      }
                      className="h-4 w-4 accent-brand"
                    />
                  </label>
                </div>
                <div className={`mt-4 grid grid-cols-3 gap-2 transition ${row.isOpen ? "opacity-100" : "opacity-45"}`}>
                  <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    {labels.from}
                    <input
                      name={`opensAt-${row.weekday}`}
                      type="time"
                      value={row.opensAt}
                      onChange={(event) =>
                        updateRow(row.weekday, { opensAt: event.target.value })
                      }
                      className="min-w-0 !px-2 !py-2 text-xs"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    {labels.until}
                    <input
                      name={`closesAt-${row.weekday}`}
                      type="time"
                      value={row.closesAt}
                      onChange={(event) =>
                        updateRow(row.weekday, { closesAt: event.target.value })
                      }
                      className="min-w-0 !px-2 !py-2 text-xs"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    {labels.slotInterval}
                    <select
                      name={`slotMinutes-${row.weekday}`}
                      value={row.slotMinutes}
                      onChange={(event) =>
                        updateRow(row.weekday, {
                          slotMinutes: Number(event.target.value),
                        })
                      }
                      className="min-w-0 !px-2 !py-2 text-xs"
                    >
                      {[15, 20, 30, 60].map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {minutes} {labels.minutes}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 flex justify-end border-t border-slate-200 pt-5">
            <SubmitButton
              label={labels.saveHours}
              pendingLabel={labels.saveHours}
            />
          </div>
        </form>
      )}
    </section>
  );
}
