"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ disabled = false, label, pendingLabel }: { disabled?: boolean; label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending || disabled}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
