import { createFileRoute } from "@tanstack/react-router";
import { Dumbbell, RotateCcw, Timer, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { doneSets, personalRecords, resetAll, sessionVolume, streak, useGym } from "@/lib/gym-store";

export const Route = createFileRoute("/profilo")({
  head: () => ({
    meta: [
      { title: "Profilo atleta — Iron Pulse" },
      {
        name: "description",
        content: "Statistiche complessive dell'atleta: sessioni, volume totale, serie e streak di allenamento.",
      },
      { property: "og:title", content: "Profilo atleta — Iron Pulse" },
      { property: "og:description", content: "Sessioni, volume totale, serie e streak." },
    ],
  }),
  component: Profilo,
});

function Profilo() {
  const { history } = useGym();
  const volume = history.reduce((t, s) => t + sessionVolume(s), 0);
  const sets = history.reduce((t, s) => t + doneSets(s), 0);
  const minutes = history.reduce(
    (t, s) => t + (s.finishedAt ? (s.finishedAt - s.startedAt) / 60000 : 0),
    0,
  );

  return (
    <AppShell>
      <header className="px-4 pt-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">Atleta</p>
        <h1 className="mt-1 font-display text-3xl leading-none">Profilo</h1>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-2 px-4">
        <Tile icon={<Dumbbell className="size-4" />} label="Sessioni" value={`${history.length}`} />
        <Tile
          icon={<TrendingUp className="size-4" />}
          label="Volume totale"
          value={`${Math.round(volume / 1000).toLocaleString("it-IT")} t`}
        />
        <Tile icon={<Dumbbell className="size-4" />} label="Serie totali" value={`${sets}`} />
        <Tile
          icon={<Timer className="size-4" />}
          label="Ore sotto il ferro"
          value={`${Math.round(minutes / 60)}h`}
        />
      </div>

      <section className="mt-8 px-4">
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent">
            Streak attuale
          </div>
          <div className="mt-1 font-display text-4xl leading-none">{streak(history)}</div>
          <p className="mt-1 text-xs text-muted-foreground">giorni consecutivi di allenamento</p>
        </div>
      </section>

      <section className="mt-8 px-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Esercizi tracciati
        </h2>
        <div className="flex flex-wrap gap-2">
          {personalRecords(history).map((pr) => (
            <span
              key={pr.name}
              className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {pr.name}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10 px-4">
        <button
          onClick={() => {
            if (window.confirm("Ripristinare i dati dimostrativi? Lo storico verrà sostituito.")) {
              resetAll();
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          <RotateCcw className="size-4" />
          Reimposta dati
        </button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          I dati restano salvati solo su questo dispositivo.
        </p>
      </section>
    </AppShell>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl leading-none">{value}</div>
    </div>
  );
}