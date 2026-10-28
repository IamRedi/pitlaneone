import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Panel({
  children,
  id,
  className
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={clsx("rounded-lg border border-slate-200 bg-white/90 p-5 shadow-panel backdrop-blur", className)}>
      {children}
    </section>
  );
}
