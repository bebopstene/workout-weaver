import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { VolumeChart } from "@/components/VolumeChart";
import {
  fmtDate,
  fmtNum,
  personalRecords,
  sessionVolume,
  useGym,
  weeklyDelta,
  weeklyVolume,
} from "@/lib/gym-store";

export const Route = createFileRoute("/progressi")({
  head: () => ({
    meta: [
      { title: "Progressi e record — Iron Pulse" },
      {
        name: "description",
        content: "Volume settimanale, andamento del carico e record personali stimati per ogni esercizio.",
      },
      { property: "og:title", content: "Progressi e record — Iron Pulse" },
      { property: "og:description", content: "Volume, andamento del carico e record personali." },
    ],
  }),
  component: Progressi,
});

function Progressi() {
  const { history, active } = useGym();
  const days = weeklyVolume(history, active);
  const delta = weeklyDelta(history, active);
  const prs = personalRecords(history);
  const recent = [...history].slice(0, 8).reverse();
  const max = Math.max(1, ...recent.map((s) => sessionVolume(s)));

  return (
    <AppShell>
      <header className="px-4 pt-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">Analisi</p>
        <h1 className="mt-1 font-display text-3xl leading-none">Progressi</h1>
      </header>

      <div className="mt-8 px-4">
        <VolumeChart days={days} delta={delta} />
      </div>

      <section className="mt-10 px-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Volume per sessione
        </h2>
        <div className="flex h-24 items-end gap-1.5">
          {recent.map((s) => (
            <div key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-accent/70"
                style={{ height: `${Math.max(6, (sessionVolume(s) / max) * 100)}%` }}
                title={`${fmtNum(sessionVolume(s))} kg`}
              />
              <span className="truncate text-[8px] font-bold uppercase text-muted-foreground">
                {fmtDate(s.date)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 px-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Record personali (1RM stimato)
        </h2>
        <div className="space-y-2">
          {prs.map((pr) => (
            <div
              key={pr.name}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{pr.name}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {pr.weight} kg × {pr.reps} · {fmtDate(pr.date)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-lg leading-none text-accent">{pr.rm}</div>
                <div className="text-[9px] font-bold uppercase text-muted-foreground">kg</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}