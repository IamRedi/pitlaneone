import Link from "next/link";
import { Home, MapPin, MessageCircle, Phone } from "lucide-react";

const phoneNumber = "+355690000000";
const whatsappNumber = "355690000000";

const actions = [
  {
    label: "Home",
    href: "/",
    icon: Home,
    external: false
  },
  {
    label: "Kontakt",
    href: "/#kontakt",
    icon: MapPin,
    external: false
  },
  {
    label: "Call",
    href: `tel:${phoneNumber}`,
    icon: Phone,
    external: true
  },
  {
    label: "WhatsApp",
    href: `https://wa.me/${whatsappNumber}`,
    icon: MessageCircle,
    external: true
  }
];

export function FloatingActionBar() {
  return (
    <nav className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-slate-200 bg-white/92 px-3 py-2 shadow-panel backdrop-blur sm:hidden">
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => {
          const content = (
            <>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                <action.icon className="h-5 w-5" />
              </span>
              {action.label}
            </>
          );
          const className = "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold text-slate-700";

          return action.external ? (
            <a key={action.label} href={action.href} className={className}>
              {content}
            </a>
          ) : (
            <Link key={action.label} href={action.href as "/" | "/#kontakt"} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
