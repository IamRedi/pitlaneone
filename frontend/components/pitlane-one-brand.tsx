import type { SVGProps } from "react";

type PitlaneOneMarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function PitlaneOneMark({ title, ...props }: PitlaneOneMarkProps) {
  return (
    <svg viewBox="0 0 48 48" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} {...props}>
      {title ? <title>{title}</title> : null}
      <rect width="48" height="48" rx="12" fill="#171B1F" />
      <path d="M13.5 37V11h12.25C32.55 11 36.5 14.55 36.5 20s-3.95 9-10.75 9H13.5" fill="none" stroke="#F8FAFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <path d="m24 19 3.75-3.75V36" fill="none" stroke="#D27A45" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.25" />
    </svg>
  );
}

export function PitlaneOneBrand({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <PitlaneOneMark className={compact ? "h-8 w-8 shrink-0" : "h-10 w-10 shrink-0"} />
      <span className={`${compact ? "text-lg" : "text-xl"} font-black tracking-[-0.035em] text-white`}>
        Pitlane<span className="text-brand-soft">One</span>
      </span>
    </span>
  );
}
