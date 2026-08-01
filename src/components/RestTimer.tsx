import { Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function RestTimer({
  seconds,
  onDismiss,
}: {
  seconds: number;
  onDismiss: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(true);
  const total = useRef(seconds);

  useEffect(() => {
    total.current = seconds;
    setLeft(seconds);
    setRunning(true);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLeft((v) => (v <= 1 ? 0 : v - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const pct = total.current ? ((total.current - left) / total.current) * 100 : 100;
  const done = left === 0;

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          aria-label={running ? "Pausa recupero" : "Riprendi recupero"}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {done ? "Recupero completato" : "Recupero"}
            </span>
            <span className={`font-display text-lg ${done ? "text-accent" : "text-foreground"}`}>
              {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Chiudi timer"
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}