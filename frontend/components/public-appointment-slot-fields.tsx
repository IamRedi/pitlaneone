"use client";

import { useState } from "react";
import { AppointmentSlotPicker } from "@/components/appointment-slot-picker";

type BookedSlot = {
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
};
type BusinessHour = {
  weekday: number;
  is_open: boolean;
  opens_at: string;
  closes_at: string;
  slot_minutes: number;
};
type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
  priceLabel: string;
};

export function PublicAppointmentSlotFields({
  bookedSlots,
  businessHours,
  serviceOptions,
  serviceLabel,
  chooseServiceLabel,
  dateLabel,
  timeLabel,
  radius,
  labelClassName,
  inputClassName,
  dark = true,
}: {
  bookedSlots: BookedSlot[];
  businessHours: BusinessHour[];
  serviceOptions: ServiceOption[];
  serviceLabel: string;
  chooseServiceLabel: string;
  dateLabel: string;
  timeLabel: string;
  radius: string;
  labelClassName?: string;
  inputClassName?: string;
  dark?: boolean;
}) {
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const selectedService = serviceOptions.find(
    (service) => service.id === selectedServiceId,
  );
  const fieldClass =
    inputClassName ??
    (dark
      ? "h-11 border border-white/25 bg-black/15 px-3 text-white outline-none"
      : "h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none");
  const serviceLabelClass =
    labelClassName ??
    (dark
      ? "grid gap-2 text-sm font-bold text-white sm:col-span-2"
      : "grid gap-2 text-sm font-bold text-slate-800 sm:col-span-2");

  return (
    <>
      <label className={serviceLabelClass}>
        {serviceLabel}
        {serviceOptions.length ? (
          <>
            <select
              required
              name="catalogItemId"
              value={selectedServiceId}
              onChange={(event) => setSelectedServiceId(event.target.value)}
              className={`${fieldClass} [&>option]:text-slate-950`}
              style={{ borderRadius: radius }}
            >
              <option value="" disabled>
                {chooseServiceLabel}
              </option>
              {serviceOptions.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.durationMinutes} min ·{" "}
                  {service.priceLabel}
                </option>
              ))}
            </select>
            <input
              type="hidden"
              name="serviceInterest"
              value={selectedService?.name ?? ""}
            />
          </>
        ) : (
          <input
            required
            name="serviceInterest"
            maxLength={120}
            className={fieldClass}
            style={{ borderRadius: radius }}
          />
        )}
      </label>
      <AppointmentSlotPicker
        bookedSlots={bookedSlots}
        businessHours={businessHours}
        dateName="preferredDate"
        timeName="preferredTime"
        fixedDuration={selectedService?.durationMinutes ?? 60}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        minuteLabel="min"
        dark={dark}
      />
    </>
  );
}
