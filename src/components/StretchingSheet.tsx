import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Play, Plus, RotateCcw, Square, Trash2 } from "lucide-react";
import { mmss, secondsLeft } from "@/lib/rest-timer";
import { totalStretchSeconds, type Stretch } from "@/lib/stretching";
import { addStretch, removeStretch, resetStretches, updateStretch } from "@/lib/gym-store";

/**
 * Defaticamento in coda all'allenamento.
 *
 * Il conto alla rovescia è ancorato all'orologio come quello del recupero:
 * durante un allungamento il telefono viene appoggiato, e un contatore a tick
 * si fermerebbe proprio mentre serve. Gli allungamenti per lato fanno due giri.
 */
export function StretchingSheet({
  dayId,
  dayName,
  stretches,
  onSkip,
  onDone,
}: {
  dayId: string;
  dayName: string;
  stretches: Stretch[];
  onSkip: () => void;
  onDone: (completedIds: string[]) => void;
}) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [side, setSide] = useState<1 | 2>(1);
  const [left, setLeft] = useState(0);
  const endAt = useRef(0);

  const active = stretches.find((s) => s.id === runningId) ?? null;

  useEffect(() => {
    if (!active) return;

    const finishSide = () => {
      if (active.perSide && side === 1) {
        setSide(2);
        endAt.current = Date.now() + active.seconds * 1000;
        setLeft(active.seconds);
        navigator.vibrate?.(60);
        return;
      }
      navigator.vibrate?.([80, 80]);
      setCompleted((prev) => new Set(prev).add(active.id));
      setRunningId(null);
      setSide(1);
    };

    const sync = () => {
      const value = secondsLeft(Date.now(), endAt.current, null);
      setLeft(value);
      if (value === 0) finishSide();
    };

    sync();
    const id = window.setInterval(sync, 250);
    const onWake = () => {
      if (!document.hidden) sync();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [active, side]);

  const start = (s: Stretch) => {
    endAt.current = Date.now() + s.seconds * 1000;
    setSide(1);
    setLeft(s.seconds);
    setRunningId(s.id);
  };

  const toggleDone = (id: string) =>
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const totale = totalStretchSeconds(stretches);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-2xl">Defaticamento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {dayName} · {Math.round(totale / 60)} min · {completed.size}/{stretches.length} fatti
            </p>
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            aria-label={editing ? "Chiudi modifica" : "Modifica allungamenti"}
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${
              editing
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted-foreground"
            }`}
          >
            <Pencil className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {stretches.map((s) => {
            const isDone = completed.has(s.id);
            const isRunning = runningId === s.id;

            if (editing) {
              return (
                <div key={s.id} className="rounded-xl border border-border bg-background/40 p-3">
                  <input
                    value={s.name}
                    onChange={(e) => updateStretch(dayId, s.id, { name: e.target.value })}
                    aria-label="Nome allungamento"
                    className="w-full bg-transparent text-sm font-bold outline-none"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={s.target}
                      onChange={(e) => updateStretch(dayId, s.id, { target: e.target.value })}
                      placeholder="Zona"
                      aria-label="Zona interessata"
                      className="min-w-0 flex-1 rounded-lg bg-secondary px-2 py-1 text-[11px] outline-none"
                    />
                    <div className="flex shrink-0 items-center gap-1 rounded-lg bg-secondary px-2 py-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={s.seconds}
                        onChange={(e) =>
                          updateStretch(dayId, s.id, {
                            seconds: Math.max(5, Number(e.target.value) || 0),
                          })
                        }
                        aria-label="Secondi di tenuta"
                        className="w-10 bg-transparent text-right text-[11px] outline-none"
                      />
                      <span className="text-[11px] text-muted-foreground">s</span>
                    </div>
                    <button
                      onClick={() => updateStretch(dayId, s.id, { perSide: !s.perSide })}
                      aria-pressed={!!s.perSide}
                      className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${
                        s.perSide
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      2 lati
                    </button>
                    <button
                      onClick={() => removeStretch(dayId, s.id)}
                      aria-label={`Elimina ${s.name}`}
                      className="shrink-0 text-muted-foreground/60 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                  isRunning
                    ? "border-accent bg-accent/10"
                    : isDone
                      ? "border-accent/30 bg-accent/5"
                      : "border-border bg-background/40"
                }`}
              >
                <button
                  onClick={() => toggleDone(s.id)}
                  aria-label={isDone ? `Segna ${s.name} da fare` : `Segna ${s.name} come fatto`}
                  aria-pressed={isDone}
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${
                    isDone
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border text-transparent"
                  }`}
                >
                  <Check className="size-4" strokeWidth={3} />
                </button>

                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-sm font-bold ${isDone ? "text-muted-foreground" : ""}`}
                  >
                    {s.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.target ? `${s.target} · ` : ""}
                    {s.seconds}s{s.perSide ? " per lato" : ""}
                    {isRunning && s.perSide ? ` · lato ${side}` : ""}
                  </div>
                </div>

                {isRunning ? (
                  <button
                    onClick={() => {
                      setRunningId(null);
                      setSide(1);
                    }}
                    aria-label="Ferma"
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-accent px-3 py-2 text-accent-foreground"
                  >
                    <Square className="size-3" />
                    <span className="font-display text-sm tabular-nums">{mmss(left)}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => start(s)}
                    aria-label={`Avvia ${s.name}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground"
                  >
                    <Play className="size-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {editing ? (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => addStretch(dayId)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              <Plus className="size-3" />
              Aggiungi
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Riporto il defaticamento di questa giornata a quello predefinito?",
                  )
                ) {
                  resetStretches(dayId);
                }
              }}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              <RotateCcw className="size-3" />
              Ripristina
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onDone([...completed])}
              className="mt-5 w-full rounded-lg bg-accent py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition-transform active:scale-[0.98]"
            >
              {completed.size
                ? `Concludi con ${completed.size} allungamenti`
                : "Concludi senza stretching"}
            </button>
            <button
              onClick={onSkip}
              className="mt-2 w-full rounded-lg border border-border py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Salta il defaticamento
            </button>
          </>
        )}
      </div>
    </div>
  );
}
