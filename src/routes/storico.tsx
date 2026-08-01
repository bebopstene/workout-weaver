import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock, Layers } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { doneSets, fmtDate, fmtNum, sessionVolume, useGym } from "@/lib/gym-store";

export const Route = createFileRoute("/storico")({
  head: () => ({
    meta: [
      { title: "Storico allenamenti — Iron Pulse" },
      {
        name: "description",
        content: "Rivedi tutte le sessioni completate con volume, durata e serie di ogni allenamento.",
      },
      { property: "og:title", content: "Storico allenamenti — Iron Pulse" },
      { property: "og:description", content: "Tutte le sessioni completate con volume e durata." },
    ],
  }),
  component: Storico,
});

function Storico() {
  const { history } = useGym();

  return (
    <AppShell>
      <header className="px-4 pt-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">Archivio</p>
        <h1 className="mt-1 font-display text-3xl leading-none">Storico</h1>
      </header>

      <div className="mt-6 space-y-2 px-4">
        {history.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nessun allenamento registrato.
          </p>
        )}
        {history.map((s) => {
          const minutes = s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : 0;
          return (
            <article key={s.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 truncate font-bold">{s.name}</h2>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-accent">
                  {fmtDate(s.date)}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                <Metric icon={<Layers className="size-3" />} label="Volume">
                  {fmtNum(sessionVolume(s))} kg
                </Metric>
                <Metric icon={<CalendarDays className="size-3" />} label="Serie">
                  {doneSets(s)}
                </Metric>
                <Metric icon={<Clock className="size-3" />} label="Durata">
                  {minutes} min
                </Metric>
              </dl>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}

function Metric({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-display text-sm">{children}</dd>
    </div>
  );
}