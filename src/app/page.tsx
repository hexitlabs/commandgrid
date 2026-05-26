import { StatusCard } from "@/components/status-card";

const capabilities = [
  "Cloudflare Workers + OpenNext foundation",
  "Neon Postgres via Hyperdrive-ready binding",
  "AI Gateway fallback-safe model routing",
  "Autonomous workflow architecture prepared",
  "Audit-first enterprise SaaS direction"
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:py-16">
      <section className="flex flex-1 flex-col justify-center gap-10">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-500">HexIT Labs</p>
          <h1 className="text-5xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-7xl">
            CommandGrid
          </h1>
          <p className="text-xl leading-8 text-slate-600 dark:text-slate-300">
            Enterprise AI Operations Command Center — Cloudflare-native foundation online and ready for autonomous incident workflows.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatusCard label="Runtime" value="Cloudflare Workers" detail="OpenNext-compatible Next.js app" />
          <StatusCard label="Database" value="Neon + Hyperdrive" detail="Dedicated CommandGrid project wired via bindings" />
          <StatusCard label="Phase" value="01 / Infra" detail="Health, CI, deploy, DB smoke" />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Phase 1 capabilities</h2>
          <ul className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <li key={capability} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                {capability}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
