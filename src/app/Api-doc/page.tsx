import Link from "next/link";
import { ArrowLeft, Code2, Compass, KeyRound, Lock, Sparkles } from "lucide-react";
import ApiWaitlistForm from "~/components/apiWaitlistForm";

const roadmapItems = [
  {
    label: "Prediction stability",
    detail: "Keep the public planner reliable before external access expands.",
    icon: Sparkles,
  },
  {
    label: "Location quality model",
    detail: "Finish recommendation scoring for water, elevation, horizon, and phase fit.",
    icon: Compass,
  },
  {
    label: "Abuse controls",
    detail: "Add rate limits, quotas, and key management before opening API traffic.",
    icon: Lock,
  },
];

export default function ApiPage() {
  return (
    <main className="nf-shell">
      <section className="relative overflow-hidden border-b border-[#dccab8] dark:border-[#34302b]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(249,115,22,0.22),transparent_30%),radial-gradient(circle_at_76%_10%,rgba(236,72,153,0.22),transparent_28%),linear-gradient(135deg,#f6efe7_0%,#fbe2cf_48%,#ece0f4_100%)] dark:bg-[radial-gradient(circle_at_20%_18%,rgba(249,115,22,0.16),transparent_30%),radial-gradient(circle_at_76%_10%,rgba(236,72,153,0.16),transparent_28%),linear-gradient(135deg,#15110f_0%,#23171f_50%,#1b1630_100%)]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-155px)] max-w-5xl content-center gap-8 px-4 py-14 md:grid-cols-[minmax(0,1fr)_320px] md:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d3ae98] bg-white/55 px-3 py-1 text-xs font-bold uppercase text-[#7b351f] backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-[#ffd1bd]">
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              API roadmap
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-normal md:text-7xl">
              Sunset intelligence for builders is coming next.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#5d5048] dark:text-[#dbcfc6]">
              Nightfalls is focused on the public sunset planner first: cleaner
              forecasts, stronger location recommendations, and a calmer map
              workflow. Join the API waitlist if you want early access when
              the developer surface opens.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/App" className="nf-button-primary">
                Open planner
              </Link>
              <Link href="/" className="nf-button-secondary">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back home
              </Link>
            </div>
          </div>

          <ApiWaitlistForm />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="nf-section-label">Roadmap</div>
            <h2 className="mt-2 text-2xl font-black">Before API release</h2>
          </div>
          <KeyRound className="hidden h-6 w-6 text-[#8b3d22] dark:text-[#f0a36d] sm:block" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {roadmapItems.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-md border border-[#dccab8] bg-white p-4 shadow-sm dark:border-[#3d3731] dark:bg-[#211f1c]"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 via-pink-500 to-violet-600 text-white">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="pb-1 text-sm font-black">{item.label}</h3>
                <p className="text-xs leading-5 text-[#6d5d54] dark:text-[#d4c6bd]">
                  {item.detail}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
