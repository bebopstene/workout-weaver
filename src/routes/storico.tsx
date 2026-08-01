import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, Clock, Layers, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { deleteSession, doneSets, fmtDate, fmtNum, sessionVolume, useGym } from "@/lib/gym-store";

export const Route = createFileRoute("/storico")({
  head: () => ({
    meta: [
      { title: "Storico allenamenti — Iron Pulse" },
      {
        name: "description",
        content:
          "Rivedi tutte le sessioni completate con volume, durata e serie di ogni allenamento.",
      },
      { property: "og:title", content: "Storico allenamenti — Iron Pulse" },
      { property: "og:description", content: "Tutte le sessioni completate con volume e durata." },
    ],
  }),
  component: Storico,
});

function Storico() {
  const { history } = useGym();
  /** Sessione in attesa di conferma: la cancellazione richiede due tap distinti. */
  const [confirming, setConfirming] = useState<string | null>(null);

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
            <article
              key={s.id}
              className={`rounded-xl border bg-card p-4 transition-colors ${
                confirming === s.id ? "border-destructive" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 truncate font-bold">{s.name}</h2>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    {fmtDate(s.date)}
                  </span>
                  <button
                    onClick={() => setConfirming(confirming === s.id ? null : s.id)}
                    aria-label={`Elimina ${s.name} del ${fmtDate(s.date)}`}
                    className="text-muted-foreground/60 transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
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

              {confirming === s.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    Elimino questo allenamento? Non si può annullare. I pesi raggiunti restano dove
                    sono.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setConfirming(null)}
                      className="flex-1 rounded-lg border border-border py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={() => {
                        deleteSession(s.id);
                        setConfirming(null);
                      }}
                      className="flex-1 rounded-lg bg-destructive py-2 text-[11px] font-bold uppercase tracking-wider text-destructive-foreground transition-transform active:scale-[0.98]"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              )}
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
