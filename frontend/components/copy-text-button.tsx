"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyTextButton({
  value,
  label,
  copiedLabel,
  className = "",
}: {
  value: string;
  label: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return <button type="button" onClick={copyValue} className={className} aria-live="polite">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? copiedLabel : label}</button>;
}
