"use client";

import { ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ThemeMode = "auto" | "light" | "dark";

const modes: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "auto", label: "Automatic", Icon: Monitor },
];

function applyMode(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "auto") root.removeAttribute("data-theme");
  else root.dataset.theme = mode;
}

export function ThemeModeSwitcher({ sidebar = false, defaultMode = "auto" }: { sidebar?: boolean; defaultMode?: ThemeMode }) {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("pitlaneone-theme-mode");
    const storedMode =
      stored === "light" || stored === "dark" || stored === "auto"
        ? stored
        : defaultMode;
    const next = sidebar && storedMode === "auto" ? defaultMode : storedMode;
    setMode(next);
    applyMode(next);
  }, [defaultMode, sidebar]);

  const ActiveIcon = modes.find((item) => item.id === mode)?.Icon ?? Monitor;
  const availableModes = sidebar ? modes.filter((item) => item.id !== "auto") : modes;
  const choose = (next: ThemeMode) => {
    setMode(next);
    window.localStorage.setItem("pitlaneone-theme-mode", next);
    applyMode(next);
    menuRef.current?.removeAttribute("open");
  };

  return (
    <details ref={menuRef} className="relative">
      <summary
        aria-label="Appearance"
        title="Appearance"
        className={sidebar ? "flex w-full cursor-pointer list-none items-center justify-between rounded-md border border-transparent px-2 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-white" : "flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border border-white/15 text-slate-200 transition hover:bg-white/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs sm:font-bold"}
      >
        <span className="flex items-center gap-2"><ActiveIcon className="h-3.5 w-3.5" aria-hidden="true" /><span>{modes.find((item) => item.id === mode)?.label}</span></span>
        {sidebar ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      </summary>
      <div className={`workspace-side-menu absolute z-50 w-40 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-xl ${sidebar ? "bottom-full left-0 mb-2" : "right-0 mt-2"}`}>
        {availableModes.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => choose(id)}
            className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-bold transition ${mode === id ? "bg-white/10 text-brand-soft" : "text-slate-200 hover:bg-white/10 hover:text-white"}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
    </details>
  );
}
