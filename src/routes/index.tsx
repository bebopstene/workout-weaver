import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flame, Trophy, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ExerciseCard } from "@/components/ExerciseCard";
import { RestTimer } from "@/components/RestTimer";
import { VolumeChart } from "@/components/VolumeChart";
import {
  PLAN,
  applyProposals,
  discardSession,
  dismissProposals,
  doneSets,
  finishSession,
  fmtDuration,
  fmtNum,
  sessionVolume,
  startSession,
  streak,
  totalSets,
  useGym,
  weeklyDelta,
  weeklyVolume,
} from "@/lib/gym-store";
import { ProgressionSheet } from "@/components/ProgressionSheet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Iron Pulse — Allenamento di oggi" },
      {
        name: "description",
        content:
          "Registra serie, ripetizioni e carichi in tempo reale con timer di recupero automatico e volume settimanale.",
      },
      { property: "og:title", content: "Iron Pulse — Allenamento di oggi" },
      {
        property: "og:description",
        content: "Registra serie, carichi e recuperi in tempo reale.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { active, history, proposals } = useGym();
  const [rest, setRest] = useState<{ seconds: number; key: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const tick = () => setElapsed(Date.now() - active.startedAt);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const days = useMemo(() => weeklyVolume(history, active), [history, active]);
  const delta = useMemo(() => weeklyDelta(history, active), [history, active]);

  const activeSetId = useMemo(() => {
    if (!active) return null;
    for (const e of active.exercises) {
      const next = e.sets.find((s) => !s.done);
      if (next) return next.id;
    }
    return null;
  }, [active]);

  if (!active) {
    const week = days.reduce((t, d) => t + d.volume, 0);
    return (
      <AppShell>
        <header className="px-4 pt-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
            Iron Pulse
          </p>
          <h1 className="mt-1 font-display text-3xl leading-none">Pronto ad allenarti</h1>
        </header>

        <div className="mt-6 grid grid-cols-3 gap-2 px-4">
          <Stat
            icon={<Flame className="size-3.5" />}
            label="Streak"
            value={`${streak(history)}g`}
          />
          <Stat
            icon={<Zap className="size-3.5" />}
            label="Vol. sett."
            value={`${Math.round(week / 1000)}t`}
          />
          <Stat
            icon={<Trophy className="size-3.5" />}
            label="Sessioni"
            value={`${history.length}`}
          />
        </div>

        <div className="mt-8 px-4">
          <VolumeChart days={days} delta={delta} />
        </div>

        <div className="mt-8 px-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Scegli la scheda
          </h2>
          <div className="space-y-2">
            {PLAN.map((day) => (
              <button
                key={day.id}
                onClick={() => startSession(day.id)}
                className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-accent"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xl"
                  style={{ backgroundColor: `${day.color}1f` }}
                >
                  {day.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{day.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {day.exercises.length} esercizi ·{" "}
                    {day.exercises.reduce((s, e) => s + e.sets, 0)} serie
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {proposals.length > 0 && (
          <ProgressionSheet
            proposals={proposals}
            onApply={applyProposals}
            onDismiss={dismissProposals}
          />
        )}
      </AppShell>
    );
  }

  const done = doneSets(active);
  const total = totalSets(active);
  const progress = total ? (done / total) * 100 : 0;

  return (
    <AppShell
      footer={
        <>
          {rest && (
            <RestTimer key={rest.key} seconds={rest.seconds} onDismiss={() => setRest(null)} />
          )}
          <div className="flex gap-2 border-b border-border px-4 py-3">
            <button
              onClick={() => {
                discardSession();
                setRest(null);
              }}
              className="rounded-lg border border-border px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-destructive"
            >
              Annulla
            </button>
            <button
              onClick={() => {
                finishSession();
                setRest(null);
              }}
              className="flex-1 rounded-lg bg-accent py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition-transform active:scale-[0.98]"
            >
              Termina allenamento
            </button>
          </div>
        </>
      }
    >
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
              In corso
            </p>
            <h1 className="truncate font-display text-xl leading-tight">{active.name}</h1>
          </div>
          <div className="text-right">
            <div className="font-display text-xl leading-none">{fmtDuration(elapsed)}</div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground">
              {fmtNum(sessionVolume(active))} kg
            </div>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {done}/{total} serie completate
        </p>
      </header>

      <div className="px-4 pt-6">
        {active.exercises.map((e) => (
          <ExerciseCard
            key={e.id}
            exercise={e}
            activeSetId={activeSetId}
            onComplete={(seconds) => setRest({ seconds, key: Date.now() })}
          />
        ))}
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 font-display text-xl leading-none">{value}</div>
    </div>
  );
}
