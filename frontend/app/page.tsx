import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  Globe2,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wrench,
} from "lucide-react";

export const metadata: Metadata = {
  title: "PitlaneOne | Workshop operations, connected",
  description: "Run customers, vehicles, work, invoices and your workshop website from one precise system.",
};

function OperationsPreview() {
  const jobs = [
    ["BMW M4", "Brake service", "In progress", "#d7ff3f"],
    ["Audi Q5", "Inspection", "Waiting", "#ffb15c"],
    ["Porsche 911", "Tyres & alignment", "Ready", "#7ee7c2"],
  ];

  return (
    <div className="relative overflow-hidden rounded-[1.15rem] border border-white/10 bg-[#11161d] shadow-[0_32px_90px_rgba(0,0,0,.5)]">
      <div className="flex h-11 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#d7ff3f]" /><span className="text-[10px] font-black uppercase tracking-[.18em] text-white">Operations</span></div>
        <span className="rounded-md border border-white/10 bg-white/[.04] px-2 py-1 text-[9px] font-bold text-[#9ca8b6]">TODAY · 08:42</span>
      </div>
      <div className="grid min-h-[300px] grid-cols-[52px_1fr] sm:grid-cols-[70px_1fr]">
        <aside className="border-r border-white/10 p-3"><Gauge className="mx-auto h-4 w-4 text-[#d7ff3f]" /><div className="mt-7 space-y-4">{[Wrench, UsersRound, CalendarDays, ReceiptText, PackageCheck].map((Icon, index) => <div key={index} className={`mx-auto grid h-7 w-7 place-items-center rounded-md ${index === 0 ? "bg-[#d7ff3f] text-[#101419]" : "text-[#657181]"}`}><Icon className="h-3.5 w-3.5" /></div>)}</div></aside>
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#7e8997]">Workshop overview</p><p className="mt-1 text-lg font-black text-white">Good morning, Alex.</p></div><span className="hidden rounded-lg bg-[#d7ff3f] px-3 py-2 text-[9px] font-black text-[#101419] sm:block">+ NEW JOB</span></div>
          <div className="mt-5 grid grid-cols-3 gap-2">{[["08", "Open jobs"], ["03", "Arrivals"], ["€4.8k", "This week"]].map(([value, label]) => <div key={label} className="rounded-lg border border-white/10 bg-white/[.035] p-3"><p className="text-lg font-black text-white">{value}</p><p className="mt-1 truncate text-[8px] uppercase tracking-wider text-[#7e8997]">{label}</p></div>)}</div>
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10">{jobs.map(([car, task, status, color], index) => <div key={car} className={`grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-3 ${index ? "border-t border-white/10" : ""}`}><div className="min-w-0"><p className="truncate text-[10px] font-bold text-white">{car}</p><p className="truncate text-[9px] text-[#778493]">{task}</p></div><span className="rounded-full px-2 py-1 text-[8px] font-bold" style={{ color, backgroundColor: `${color}14` }}>{status}</span></div>)}</div>
        </div>
      </div>
    </div>
  );
}

function WebsitePhone() {
  return (
    <div className="relative mx-auto w-[190px] rounded-[2.15rem] border-[6px] border-[#20262e] bg-[#20262e] p-1 shadow-[0_28px_70px_rgba(0,0,0,.5)] sm:w-[214px]">
      <div className="absolute left-1/2 top-2 z-10 h-3 w-16 -translate-x-1/2 rounded-full bg-[#20262e]" />
      <div className="overflow-hidden rounded-[1.55rem] bg-[#f2f0ea] text-[#171b1f]">
        <div className="relative h-52 overflow-hidden"><img src="/images/templates/midnight-hero-mobile-v1.png" alt="Premium workshop website on mobile" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/15" /><div className="absolute left-4 right-4 top-5 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white"><span>HØRSEPOWER</span><span>Menu</span></div><div className="absolute bottom-4 left-4 right-4 text-white"><p className="text-[8px] font-bold uppercase tracking-[.22em] text-[#d7ff3f]">Precision service</p><p className="mt-2 text-xl font-black leading-[.95]">Built to perform.</p></div></div>
        <div className="p-4"><div className="grid grid-cols-2 gap-2">{["Diagnostics", "Performance"].map((item) => <div key={item} className="rounded-lg bg-white p-2 text-[8px] font-black shadow-sm">{item}</div>)}</div><button className="mt-3 w-full rounded-lg bg-[#d7ff3f] py-2 text-[8px] font-black uppercase tracking-wider">Book a service</button></div>
      </div>
    </div>
  );
}

const workflow = [
  [UsersRound, "Customer"], [Gauge, "Vehicle"], [CalendarDays, "Appointment"],
  [Wrench, "Job"], [ReceiptText, "Invoice"], [ChevronRight, "Return"],
] as const;

export default async function HomePage() {
  const t = await getTranslations("landing");
  const capabilities = [
    { icon: UsersRound, number: "01", title: t("benefitCustomersTitle"), text: t("benefitCustomersText") },
    { icon: ClipboardCheck, number: "02", title: "Work that moves", text: "Appointments become active jobs. Every task, part and note stays attached to the right vehicle." },
    { icon: ReceiptText, number: "03", title: t("benefitInvoicesTitle"), text: t("benefitInvoicesText") },
    { icon: PackageCheck, number: "04", title: "Stock without guesswork", text: "Know what is on the shelf, what was sold and what needs ordering next." },
    { icon: Globe2, number: "05", title: t("benefitWebsiteTitle"), text: t("benefitWebsiteText") },
    { icon: ShieldCheck, number: "06", title: "Built for your team", text: "Clear roles, company-scoped data and a workspace that remains calm on busy days." },
  ];

  return (
    <main className="overflow-hidden bg-[#eef0ed] text-[#11161b]">
      <section className="relative isolate overflow-hidden border border-[#28313b] bg-[#090d12] px-5 pb-10 pt-14 text-white shadow-[0_32px_90px_rgba(15,20,25,.24)] sm:px-9 lg:min-h-[720px] lg:px-14 lg:pb-16 lg:pt-20">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(215,255,63,.08),transparent_26%),radial-gradient(circle_at_86%_20%,rgba(215,255,63,.09),transparent_25%),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:auto,auto,42px_42px,42px_42px]" />
        <div className="absolute right-7 top-7 hidden items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-[#687482] md:flex"><span className="h-px w-12 bg-[#d7ff3f]" /> Workshop OS · 2026</div>
        <div className="grid items-center gap-12 lg:grid-cols-[.82fr_1.18fr]">
          <div className="relative z-10">
            <p className="inline-flex items-center gap-2 border-l-2 border-[#d7ff3f] pl-3 text-[11px] font-black uppercase tracking-[.24em] text-[#d7ff3f]"><Sparkles className="h-3.5 w-3.5" />{t("eyebrow")}</p>
            <h1 className="mt-7 max-w-2xl text-5xl font-black uppercase leading-[.91] tracking-[-.065em] sm:text-7xl lg:text-[5.45rem]">Run your<br />workshop.<span className="mt-2 block text-[#d7ff3f]">Own the road.</span></h1>
            <p className="mt-7 max-w-lg border-l border-white/15 pl-5 text-base leading-7 text-[#aeb8c3] sm:text-lg">{t("heroDescription")}</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link href="/signup?next=%2Fonboarding%3Fnew%3D1" className="group inline-flex items-center gap-3 rounded-lg bg-[#d7ff3f] px-5 py-3.5 text-sm font-black uppercase tracking-wide text-[#11161b] shadow-[0_14px_38px_rgba(215,255,63,.18)] transition hover:bg-white">Start your demo<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link><Link href="/#website" className="inline-flex items-center rounded-lg border border-white/20 bg-white/[.04] px-5 py-3.5 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/[.08]">See a workshop website</Link></div>
            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#85919e]">{["14-day demo", "No card required", "Setup guided"].map((item) => <span key={item} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#d7ff3f]" />{item}</span>)}</div>
          </div>
          <div className="relative min-h-[470px] lg:min-h-[520px]">
            <div className="absolute left-0 top-7 w-[88%]"><OperationsPreview /></div>
            <div className="absolute -bottom-3 right-0 z-10"><WebsitePhone /></div>
            <div className="absolute bottom-5 left-5 hidden rounded-lg border border-white/10 bg-[#11161d]/90 px-4 py-3 backdrop-blur sm:block"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#788493]">One connected presence</p><p className="mt-1 text-xs font-bold text-white">Back office <span className="px-1 text-[#d7ff3f]">+</span> customer website</p></div>
          </div>
        </div>
      </section>

      <section aria-label="Platform scope" className="border-x border-b border-[#cbd0cc] bg-[#e4e7e3] px-5 py-5"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[10px] font-black uppercase tracking-[.19em] text-[#566068] sm:justify-between">{["Customers", "Vehicles", "Appointments", "Work orders", "Invoices", "Website"].map((item, index) => <span key={item} className="flex items-center gap-3"><span>{item}</span>{index < 5 && <span className="hidden h-1 w-1 rounded-full bg-[#a5b52d] sm:block" />}</span>)}</div></section>

      <section id="features" className="mx-auto max-w-7xl px-1 py-24 sm:py-32">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-[11px] font-black uppercase tracking-[.22em] text-[#718000]">Everything in position</p><h2 className="mt-5 max-w-md text-4xl font-black uppercase leading-[.96] tracking-[-.05em] sm:text-6xl">Everything your workshop needs.</h2></div><p className="max-w-2xl self-end text-lg leading-8 text-[#59636b]">From the first phone call to the next service reminder, PitlaneOne keeps the entire workshop journey visible and connected.</p></div>
        <div className="mt-14 grid border-l border-t border-[#c9ceca] md:grid-cols-2 lg:grid-cols-3">{capabilities.map(({ icon: Icon, number, title, text }) => <article key={number} className="group min-h-[290px] border-b border-r border-[#c9ceca] bg-[#f5f6f3] p-7 transition hover:bg-white"><div className="flex items-center justify-between"><span className="text-xs font-black tracking-widest text-[#89928d]">{number}</span><Icon className="h-5 w-5 text-[#667300] transition group-hover:text-[#9aad00]" /></div><h3 className="mt-16 text-xl font-black uppercase tracking-[-.025em]">{title}</h3><p className="mt-4 max-w-sm leading-7 text-[#626b72]">{text}</p></article>)}</div>
      </section>

      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[#11161b] px-5 py-24 text-white sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="text-[11px] font-black uppercase tracking-[.22em] text-[#d7ff3f]">A real workshop flow</p><h2 className="mt-4 text-4xl font-black uppercase tracking-[-.045em] sm:text-5xl">One job. No broken handoffs.</h2></div><p className="max-w-lg leading-7 text-[#9da8b3]">Each step carries the context forward, so the team always knows what happened and what happens next.</p></div>
          <div className="mt-14 grid overflow-hidden border border-white/10 sm:grid-cols-3 lg:grid-cols-6">{workflow.map(([Icon, label], index) => <div key={label} className="relative border-b border-white/10 p-5 last:border-b-0 sm:border-r lg:border-b-0"><span className="text-[10px] font-black text-[#65717e]">0{index + 1}</span><Icon className="mt-12 h-5 w-5 text-[#d7ff3f]" /><p className="mt-4 text-sm font-black uppercase tracking-wide">{label}</p>{index < workflow.length - 1 && <ChevronRight className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 rounded-full bg-[#11161b] text-[#58636e] lg:block" />}</div>)}</div>
        </div>
      </section>

      <section id="website" className="mx-auto max-w-7xl px-1 py-24 sm:py-32">
        <div className="grid gap-8 lg:grid-cols-[1fr_.8fr]"><div><p className="text-[11px] font-black uppercase tracking-[.22em] text-[#718000]">Customer-facing, by design</p><h2 className="mt-5 max-w-3xl text-4xl font-black uppercase leading-[.96] tracking-[-.05em] sm:text-6xl">Your workshop deserves more than a generic website.</h2></div><div className="self-end"><p className="text-lg leading-8 text-[#5d676f]">A professional website is part of the system—not an afterthought. Match the design to the kind of workshop you run.</p><Link href="/gallery" className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#596600]">Explore workshop websites <ArrowRight className="h-4 w-4" /></Link></div></div>
        <div className="mt-14 grid gap-5 lg:grid-cols-3">{[
          ["Performance shop", "/images/templates/midnight-hero-v1.png", "bg-[#14171b] text-white", "01"],
          ["General workshop", "/images/templates/arctic-hero-v1.png", "bg-[#e9edef] text-[#18222b]", "02"],
          ["Tyre service", "/images/templates/graphite-hero-v1.png", "bg-[#292e32] text-white", "03"],
        ].map(([title, image, palette, number], index) => <article key={title} className={`group overflow-hidden rounded-xl ${palette} ${index === 1 ? "lg:translate-y-8" : ""}`}><div className="flex items-center justify-between px-5 py-4 text-[10px] font-black uppercase tracking-[.18em]"><span>{number}</span><span>{title}</span></div><div className="relative mx-3 mb-3 h-72 overflow-hidden rounded-lg"><img src={image} alt={`${title} website preview`} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" /><div className="absolute bottom-3 right-3 w-20 overflow-hidden rounded-[1rem] border-[3px] border-[#20252b] bg-[#20252b] shadow-xl"><img src={index === 1 ? "/images/templates/arctic-hero-mobile-v1.png" : index === 2 ? "/images/templates/graphite-hero-mobile-v1.png" : "/images/templates/midnight-hero-mobile-v1.png"} alt="" className="h-32 w-full object-cover" /></div></div></article>)}</div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 border-t border-[#c6ccc7] px-1 py-24 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div><p className="text-[11px] font-black uppercase tracking-[.22em] text-[#718000]">Customer experience</p><h2 className="mt-5 max-w-xl text-4xl font-black uppercase leading-[.98] tracking-[-.045em] sm:text-5xl">Professional before the car reaches the lift.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-[#5f6970]">Online appointment requests, clear approvals and a polished mobile experience build trust before the first conversation.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">{[[CalendarDays, "Book online", "Customers request the right service and time."], [FileCheck2, "Approve clearly", "Keep decisions and documents attached to the job."], [Gauge, "Stay informed", "The front desk and workshop share one current view."], [Globe2, "Look established", "Every customer touchpoint carries your identity."]].map(([Icon, title, text]) => { const I = Icon as typeof CalendarDays; return <div key={title as string} className="rounded-xl border border-[#cbd0cc] bg-white/70 p-5"><I className="h-5 w-5 text-[#718000]" /><h3 className="mt-8 font-black uppercase">{title as string}</h3><p className="mt-2 text-sm leading-6 text-[#697279]">{text as string}</p></div>; })}</div>
      </section>

      <section id="pricing" className="relative overflow-hidden rounded-[1.5rem] bg-[#d7ff3f] px-6 py-16 sm:px-12 lg:px-16 lg:py-20"><div className="absolute -right-20 -top-36 text-[24rem] font-black leading-none text-[#11161b]/[.045]">01</div><div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-[11px] font-black uppercase tracking-[.22em] text-[#4e5900]">Your next operating system</p><h2 className="mt-5 max-w-4xl text-4xl font-black uppercase leading-[.94] tracking-[-.055em] text-[#101419] sm:text-6xl">Your workshop. One system. One professional presence.</h2></div><Link href="/signup?next=%2Fonboarding%3Fnew%3D1" className="inline-flex w-fit items-center gap-3 rounded-lg bg-[#11161b] px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#303840]">Start your demo <ArrowRight className="h-4 w-4" /></Link></div></section>
    </main>
  );
}
