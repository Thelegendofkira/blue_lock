import Image from "next/image";
import Link from "next/link";

const engines = [
  {
    id: "hierarchy",
    number: "01",
    title: "Goal Hierarchy & Cognitive Limits",
    summary: "Infinite nesting. Hard enforcement. No excuses.",
    features: [
      {
        label: "Infinite Nesting",
        detail:
          "Goals → Sub-goals (nested as deep as needed) → Tasks. Every layer has a single owner above it.",
      },
      {
        label: "Strict Immutability",
        detail:
          "Once a Goal is set, its Deadline and original Reason cannot be changed. You cannot move the goalposts when things get hard.",
      },
      {
        label: "Quantifiable Tasks",
        detail:
          "Every leaf-level task must have a measurable target — e.g. 'Solve 50 LeetCode problems' or 'Read 10 chapters'.",
      },
      {
        label: "Cognitive Boundary",
        detail:
          "The system physically blocks you from over-scheduling. Deep Work ≤ 4 h/day · Shallow Work ≤ 2 h/day · Total logged time ≤ 12 h/day.",
      },
    ],
  },
  {
    id: "daily",
    number: "02",
    title: "Daily Execution Engine",
    summary: "1-hour blocks. Real accountability. Zero ambiguity.",
    features: [
      {
        label: "Dynamic Time Blocking",
        detail:
          "Your day is split into 1-hour slots. Within 3 hours of a slot ending, you must log what you did, the task it mapped to, and how much progress you made.",
      },
      {
        label: "Exemptions",
        detail:
          "Mark any slot as Sleep or College to instantly shield it from the logging rule. No penalties for time you were legitimately occupied.",
      },
      {
        label: "Distraction Tracking",
        detail:
          "Log whether you maintained focus or got distracted each hour. Patterns surface in your weekly retrospective.",
      },
    ],
  },
  {
    id: "temporal",
    number: "03",
    title: "Temporal Tracking (Jurisdiction)",
    summary: "Your history is honest. Your progress is precise.",
    features: [
      {
        label: "Goal History",
        detail:
          "The system records the exact timeframe every goal and task is active. You can Pause or Stop a task at any time without losing the record.",
      },
      {
        label: "Accurate Calculation",
        detail:
          "Progress analysis only judges you against goals that were in your active jurisdiction during that specific timeframe. Past decisions can't distort current metrics.",
      },
    ],
  },
  {
    id: "intelligence",
    number: "04",
    title: "Intelligence & Accountability Loop",
    summary: "AI analysis. WhatsApp delivery. No escape.",
    features: [
      {
        label: "7:00 AM Trigger",
        detail:
          "Every morning a background job gathers your logs, maps them against active goals, and calculates raw progress — automatically.",
      },
      {
        label: "LLM Analysis",
        detail:
          "The data is fed to an LLM that identifies bad habits, flags deviations from your plan, and generates aggressive, focused advice for the day ahead.",
      },
      {
        label: "WhatsApp Delivery",
        detail:
          "Your daily report and advice lands directly in WhatsApp via Twilio — no app to open, no dashboard to check.",
      },
      {
        label: "Relentless Reminders",
        detail:
          "If a deadline passes and you haven't declared success or failure, the system messages you every single day until you face the result.",
      },
    ],
  },
  {
    id: "retrospectives",
    number: "05",
    title: "Retrospectives",
    summary: "Weekly & monthly dashboards. Cached. Intelligent.",
    features: [
      {
        label: "Historical Dashboards",
        detail:
          "Zoomed-out views of your weekly and monthly execution. See patterns you can't spot in the daily grind.",
      },
      {
        label: "Cached Analysis",
        detail:
          "Past weeks are stored in the database. The LLM only re-analyses a past week if the underlying data is retroactively changed — preventing wasteful recomputation.",
      },
    ],
  },
];

const appNavLinks = [
  { href: "/daily", label: "Daily" },
  { href: "/goals", label: "Goals" },
  { href: "/weekly", label: "Weekly" },
  { href: "/monthly", label: "Monthly" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans scroll-smooth">

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Logo wordmark */}
          <a href="#" className="flex items-center gap-3 group">
            <Image
              src="/logo.png"
              alt="App logo"
              width={36}
              height={36}
              className="drop-shadow-[0_0_8px_rgba(37,99,235,0.6)] transition-transform group-hover:scale-110"
            />
            <span className="text-lg font-black tracking-tight text-white">
              Blue<span className="text-blue-500">Lock</span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {appNavLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-blue-400"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:block text-sm font-semibold text-zinc-300 transition-colors hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-32 text-center">
        {/* Background glows */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute right-0 top-1/2 h-[350px] w-[350px] rounded-full bg-blue-800/8 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-blue-600/20 blur-2xl" />
          <Image
            src="/logo.png"
            alt="App logo"
            width={96}
            height={96}
            priority
            className="relative drop-shadow-[0_0_24px_rgba(37,99,235,0.7)]"
          />
        </div>

        {/* Blue Lock Quote */}
        <blockquote className="relative mb-8 max-w-2xl">
          <span className="absolute -left-4 -top-4 text-7xl leading-none text-blue-600/20 font-serif select-none">&ldquo;</span>
          <p className="relative text-xl font-semibold italic leading-relaxed text-blue-200 md:text-2xl">
            It is now or never life does not give second chances
          </p>
          <footer className="mt-3 text-sm font-medium tracking-widest text-blue-500 uppercase">
            — Ego Jinpachi, Blue Lock
          </footer>
        </blockquote>

        {/* Tagline */}
        <h1 className="mb-4 text-4xl font-black tracking-tight text-white md:text-6xl">
          Your Cognitive{" "}
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Command Centre
          </span>
        </h1>
        <p className="mb-10 max-w-xl text-base text-zinc-400 md:text-lg">
          A ruthlessly structured goal and time management system with AI
          accountability. Built for people who are serious about getting better.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            Start Now
          </Link>
          <a
            href="#features"
            className="rounded-xl border border-zinc-700 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-zinc-300 transition-all hover:border-blue-600 hover:text-blue-400"
          >
            See How It Works ↓
          </a>
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────────────────── */}
      <section className="border-y border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-zinc-800 px-6 md:grid-cols-4">
          {[
            { value: "4 h", label: "Max Deep Work / Day" },
            { value: "1 h", label: "Logging Resolution" },
            { value: "7 AM", label: "Daily AI Report" },
            { value: "∞", label: "Goal Nesting Depth" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-8 px-4 text-center">
              <span className="text-3xl font-black text-blue-400">{s.value}</span>
              <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>



      {/* ── FOOTER CTA ─────────────────────────────────────────── */}
      <section className="border-t border-zinc-800 bg-zinc-900/40 px-6 py-20 text-center">
        <Image
          src="/logo.png"
          alt="App logo"
          width={48}
          height={48}
          className="mx-auto mb-6 drop-shadow-[0_0_12px_rgba(37,99,235,0.5)]"
        />
        <h2 className="mb-4 text-3xl font-black text-white">
          Ready to stop drifting?
        </h2>
        <p className="mx-auto mb-8 max-w-md text-zinc-400">
          Create your account and let the system hold you accountable from day one.
        </p>
        <Link
          href="/register"
          className="inline-block rounded-xl bg-blue-600 px-8 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500"
        >
          Create Free Account
        </Link>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-500">
            <Image src="/logo.png" alt="" width={18} height={18} />
            Blue<span className="text-blue-500">Lock</span>
          </div>
          <div className="flex gap-6">
            <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Sign In</Link>
            <Link href="/register" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Register</Link>
            <Link href="/daily" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
