"use client";

import { useRef } from "react";
import { Menu } from "lucide-react";

type MobileMenuItem = {
  href: `#${string}`;
  label: string;
};

export function BusinessSiteMobileMenu({
  label,
  items,
  borderColor,
  background,
  radius,
}: {
  label: string;
  items: MobileMenuItem[];
  borderColor: string;
  background: string;
  radius: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={detailsRef} className="group lg:hidden">
      <summary
        aria-label={label}
        className="grid h-10 w-10 cursor-pointer list-none place-items-center border"
        style={{ borderColor, borderRadius: radius }}
      >
        <Menu className="h-5 w-5" />
      </summary>
      <nav
        className="absolute right-5 top-[calc(100%+8px)] grid min-w-52 gap-1 border p-2 text-sm font-semibold shadow-xl sm:right-8"
        style={{ borderColor, background, borderRadius: radius }}
      >
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="px-3 py-2"
            onClick={() => detailsRef.current?.removeAttribute("open")}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </details>
  );
}
