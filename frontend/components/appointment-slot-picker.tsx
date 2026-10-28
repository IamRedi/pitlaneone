"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type BookedSlot = { scheduled_date: string; scheduled_time: string; duration_minutes: number };
type BusinessHour = { weekday: number; is_open: boolean; opens_at: string; closes_at: string; slot_minutes: number };
type Choice = { value: string; label: string; disabled?: boolean };
type Position = { top: number; left: number; width: number };

function dateValue(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function dateFromValue(value: string) { return new Date(`${value}T12:00:00`); }
function minutes(value: string) { const [hours, mins] = value.slice(0, 5).split(":").map(Number); return hours * 60 + mins; }
function timeValue(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function compactDate(value: string) { return dateFromValue(value).toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric" }); }

function popupPosition(button: HTMLButtonElement, minimumWidth: number): Position {
  const rect = button.getBoundingClientRect();
  const width = Math.max(minimumWidth, rect.width);
  return { top: rect.bottom + 8, left: Math.min(Math.max(12, rect.left), window.innerWidth - width - 12), width };
}

function useDismissiblePopup(buttonRef: React.RefObject<HTMLButtonElement | null>, position: Position | null, setPosition: (position: Position | null) => void, minimumWidth: number) {
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!position) return;
    const reposition = () => { if (buttonRef.current) setPosition(popupPosition(buttonRef.current, minimumWidth)); };
    const dismiss = (event: PointerEvent) => { const target = event.target as Node; if (!buttonRef.current?.contains(target) && !popupRef.current?.contains(target)) setPosition(null); };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("pointerdown", dismiss);
    return () => { window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); document.removeEventListener("pointerdown", dismiss); };
  }, [buttonRef, minimumWidth, position, setPosition]);
  return popupRef;
}

function CompactOptions({ name, value, choices, onChange, disabled = false }: { name: string; value: string; choices: Choice[]; onChange: (value: string) => void; disabled?: boolean }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const popupRef = useDismissiblePopup(buttonRef, position, setPosition, 184);
  const selected = choices.find((choice) => choice.value === value);
  const open = () => { if (buttonRef.current) setPosition(popupPosition(buttonRef.current, 184)); };
  const close = () => setPosition(null);
  return <div><input type="hidden" name={name} value={value} /><button ref={buttonRef} type="button" disabled={disabled} onClick={() => position ? close() : open()} className="flex h-8 w-full items-center justify-between gap-2 border-b border-slate-600 bg-transparent px-0 text-left text-sm font-bold text-white outline-none transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-500" aria-expanded={Boolean(position)}><span className="truncate">{selected?.label ?? "—"}</span><ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${position ? "rotate-180" : ""}`} /></button>{position && typeof document !== "undefined" ? createPortal(<div ref={popupRef} style={{ top: position.top, left: position.left, width: position.width }} className="fixed z-[100] max-h-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-1.5 shadow-2xl"><div className="grid gap-0.5">{choices.map((choice) => <button key={choice.value} type="button" disabled={choice.disabled} onClick={() => { if (!choice.disabled) { onChange(choice.value); close(); } }} className={`rounded-lg px-2.5 py-2 text-left text-sm transition ${choice.value === value ? "bg-white/15 font-bold text-white" : choice.disabled ? "cursor-not-allowed text-slate-600" : "text-slate-200 hover:bg-white/10"}`}>{choice.label}</button>)}</div></div>, document.body) : null}</div>;
}

function CompactCalendar({ name, value, availableDates, onChange }: { name: string; value: string; availableDates: string[]; onChange: (value: string) => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstAvailable = availableDates[0] ?? dateValue(new Date());
  const [position, setPosition] = useState<Position | null>(null);
  const popupRef = useDismissiblePopup(buttonRef, position, setPosition, 288);
  const [month, setMonth] = useState(() => { const initial = dateFromValue(value || firstAvailable); return new Date(initial.getFullYear(), initial.getMonth(), 1); });
  const earliest = dateFromValue(firstAvailable); const latest = dateFromValue(availableDates.at(-1) ?? firstAvailable);
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(firstDay); gridStart.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => { const day = new Date(gridStart); day.setDate(gridStart.getDate() + index); return day; });
  const previous = new Date(month.getFullYear(), month.getMonth() - 1, 1); const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const canPrevious = previous >= new Date(earliest.getFullYear(), earliest.getMonth(), 1); const canNext = next <= new Date(latest.getFullYear(), latest.getMonth(), 1);
  const open = () => { if (buttonRef.current) setPosition(popupPosition(buttonRef.current, 288)); };
  const close = () => setPosition(null);
  const calendar = <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 shadow-2xl"><div className="mb-3 flex items-center justify-between"><button type="button" disabled={!canPrevious} onClick={() => setMonth(previous)} className="rounded-md p-1 text-slate-300 hover:bg-white/10 disabled:text-slate-700"><ChevronLeft className="h-4 w-4" /></button><span className="text-sm font-bold capitalize text-white">{month.toLocaleDateString("sq-AL", { month: "long", year: "numeric" })}</span><button type="button" disabled={!canNext} onClick={() => setMonth(next)} className="rounded-md p-1 text-slate-300 hover:bg-white/10 disabled:text-slate-700"><ChevronRight className="h-4 w-4" /></button></div><div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-500">{["H", "Ma", "M", "Më", "E", "P", "Sh"].map((label) => <span key={label}>{label}</span>)}</div><div className="mt-1 grid grid-cols-7 gap-1">{days.map((day) => { const current = dateValue(day); const isCurrentMonth = day.getMonth() === month.getMonth(); const isAvailable = availableDates.includes(current); const isSelected = current === value; return <button key={current} type="button" disabled={!isAvailable} onClick={() => { onChange(current); close(); }} className={`h-8 rounded-md text-xs transition ${isSelected ? "bg-brand font-black text-white" : isAvailable && isCurrentMonth ? "font-semibold text-slate-200 hover:bg-white/10" : "cursor-not-allowed text-slate-700"}`}>{day.getDate()}</button>; })}</div></div>;
  return <div><input type="hidden" name={name} value={value} /><button ref={buttonRef} type="button" onClick={() => position ? close() : open()} className="flex h-8 w-full items-center justify-between gap-2 border-b border-slate-600 bg-transparent px-0 text-left text-sm font-bold text-white outline-none transition hover:border-slate-400" aria-expanded={Boolean(position)}><span>{compactDate(value)}</span><ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${position ? "rotate-180" : ""}`} /></button>{position && typeof document !== "undefined" ? createPortal(<div ref={popupRef} style={{ top: position.top, left: position.left, width: position.width }} className="fixed z-[100]">{calendar}</div>, document.body) : null}</div>;
}

export function AppointmentSlotPicker({ bookedSlots, businessHours, dateName, timeName, durationName, fixedDuration, initialDuration, initialDate, initialTime, dateLabel, timeLabel, durationLabel, minuteLabel, dark = false, minimal = false }: { bookedSlots: BookedSlot[]; businessHours: BusinessHour[]; dateName: string; timeName: string; durationName?: string; fixedDuration?: number; initialDuration?: number; initialDate?: string; initialTime?: string; dateLabel: string; timeLabel: string; durationLabel?: string; minuteLabel: string; dark?: boolean; minimal?: boolean }) {
  const [chosenDate, setChosenDate] = useState(initialDate ?? dateValue(new Date()));
  const [chosenDuration, setChosenDuration] = useState(initialDuration ?? 60);
  const [chosenTime, setChosenTime] = useState(initialTime ?? "");
  const effectiveDuration = fixedDuration ?? chosenDuration;
  const durationChoices = Array.from(new Set([30, 45, 60, 90, 120, 180, 240, initialDuration].filter((value): value is number => typeof value === "number" && value >= 15 && value <= 480))).sort((left, right) => left - right);
  const optionsByDate = useMemo(() => {
    const output = new Map<string, string[]>();
    for (let offset = 0; offset < 90; offset += 1) {
      const day = new Date(); day.setDate(day.getDate() + offset); const date = dateValue(day); const hours = businessHours.find((row) => row.weekday === day.getDay());
      if (!hours?.is_open) continue;
      const booked = bookedSlots.filter((slot) => slot.scheduled_date === date);
      const values = Array.from({ length: Math.floor((minutes(hours.closes_at) - minutes(hours.opens_at)) / hours.slot_minutes) }, (_, index) => minutes(hours.opens_at) + index * hours.slot_minutes).filter((start) => start + effectiveDuration <= minutes(hours.closes_at) && !booked.some((slot) => start < minutes(slot.scheduled_time) + slot.duration_minutes && start + effectiveDuration > minutes(slot.scheduled_time))).map(timeValue);
      if (values.length) output.set(date, values);
    }
    return output;
  }, [bookedSlots, businessHours, effectiveDuration]);
  const availableDates = [...optionsByDate.keys()]; const activeDate = optionsByDate.has(chosenDate) ? chosenDate : availableDates[0] ?? ""; const availableTimes = optionsByDate.get(activeDate) ?? [];
  const activeTime = availableTimes.includes(chosenTime) ? chosenTime : availableTimes.includes(initialTime ?? "") && activeDate === initialDate ? initialTime! : availableTimes[0] ?? "";
  const activeHours = businessHours.find((row) => row.weekday === dateFromValue(activeDate || dateValue(new Date())).getDay());
  const allTimes = activeHours ? Array.from({ length: Math.floor((minutes(activeHours.closes_at) - minutes(activeHours.opens_at)) / activeHours.slot_minutes) }, (_, index) => timeValue(minutes(activeHours.opens_at) + index * activeHours.slot_minutes)) : [];
  const fieldClass = dark ? "h-11 border border-white/30 bg-[#080b10]/90 px-3 text-white outline-none transition focus:border-white/70" : "h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
  const labelClass = dark ? "grid gap-2 text-sm font-bold text-white" : minimal ? "grid gap-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400" : "grid gap-1 text-xs font-bold text-slate-700";
  if (minimal) return <><label className={labelClass}>{dateLabel}<CompactCalendar name={dateName} value={activeDate} availableDates={availableDates} onChange={(date) => { setChosenDate(date); setChosenTime(""); }} /></label><label className={labelClass}>{timeLabel}<CompactOptions name={timeName} value={activeTime} choices={allTimes.map((time) => ({ value: time, label: time, disabled: !availableTimes.includes(time) }))} onChange={setChosenTime} disabled={!activeTime} /></label>{durationName && durationLabel ? <label className={labelClass}>{durationLabel}<CompactOptions name={durationName} value={String(chosenDuration)} choices={durationChoices.map((duration) => ({ value: String(duration), label: `${duration} ${minuteLabel}` }))} onChange={(duration) => { setChosenDuration(Number(duration)); setChosenTime(""); }} /></label> : null}</>;
  return <><label className={labelClass}>{dateLabel}<select name={dateName} required value={activeDate} onChange={(event) => { setChosenDate(event.target.value); setChosenTime(""); }} disabled={!availableDates.length} className={fieldClass}>{availableDates.map((date) => <option key={date} value={date}>{date}</option>)}</select></label><label className={labelClass}>{timeLabel}<select name={timeName} required value={activeTime} onChange={(event) => setChosenTime(event.target.value)} disabled={!activeTime} className={fieldClass}>{availableTimes.map((time) => <option key={time} value={time}>{time}</option>)}</select></label>{durationName && durationLabel ? <label className={labelClass}>{durationLabel}<select name={durationName} value={chosenDuration} onChange={(event) => setChosenDuration(Number(event.target.value))} className={fieldClass}>{durationChoices.map((item) => <option key={item} value={item}>{item} {minuteLabel}</option>)}</select></label> : null}</>;
}
