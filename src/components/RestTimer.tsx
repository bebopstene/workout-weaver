import { Pause, Play, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { elapsedPct, freeze, mmss, secondsLeft, thaw } from "@/lib/rest-timer";

/** Segnale di fine recupero: prima la vibrazione, poi tre bip brevi. */
function alertEndOfRest() {
  try {
    navigator.vibrate?.([80, 80, 80]);
  } catch {
    /* vibrazione non supportata */
  }
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    for (const delay of [0, 180, 360]) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      const t = ac.currentTime + delay / 1000;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.start(t);
      osc.stop(t + 0.18);
    }
  } catch {
    /* audio bloccato dal browser */
  }
}

/**
 * Timer di recupero ancorato all'orologio, non al numero di tick.
 *
 * Contare `setInterval` da un secondo sembra equivalente ma non lo è: quando
 * lo schermo si spegne o la scheda va in secondo piano, il browser rallenta o
 * sospende i timer. Un contatore a tick si ferma lì e riprende da dov'era,
 * mostrando meno tempo di quello davvero passato.
 *
 * Qui si memorizza l'istante di fine e i secondi restanti si ricavano da
 * `Date.now()` a ogni controllo: se il telefono resta in tasca due minuti, al
 * ritorno il recupero risulta finito, che è la verità.
 */
export function RestTimer({ seconds, onDismiss }: { seconds: number; onDismiss: () => void }) {
  const [running, setRunning] = useState(true);
  const [left, setLeft] = useState(seconds);

  const endAt = useRef(Date.now() + seconds * 1000);
  /** Millisecondi congelati mentre è in pausa. */
  const frozen = useRef<number | null>(null);
  const total = useRef(seconds);
  const alerted = useRef(false);

  const remaining = useCallback(() => secondsLeft(Date.now(), endAt.current, frozen.current), []);

  useEffect(() => {
    total.current = seconds;
    endAt.current = Date.now() + seconds * 1000;
    frozen.current = null;
    alerted.current = false;
    setRunning(true);
    setLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;

    const sync = () => {
      const value = remaining();
      setLeft(value);
      if (value === 0 && !alerted.current) {
        alerted.current = true;
        alertEndOfRest();
      }
    };

    sync();
    // Ogni 250 ms: il secondo mostrato non resta mai indietro rispetto all'orologio.
    const id = window.setInterval(sync, 250);
    // Al rientro in primo piano il valore va riallineato subito, senza aspettare il tick.
    const onWake = () => {
      if (!document.hidden) sync();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("pageshow", onWake);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("pageshow", onWake);
    };
  }, [running, remaining]);

  const toggle = () => {
    if (running) {
      frozen.current = freeze(Date.now(), endAt.current);
      setRunning(false);
    } else {
      endAt.current = thaw(Date.now(), frozen.current ?? 0);
      frozen.current = null;
      setRunning(true);
    }
  };

  const pct = elapsedPct(total.current, left);
  const done = left === 0;

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label={running ? "Pausa recupero" : "Riprendi recupero"}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {done ? "Recupero completato" : running ? "Recupero" : "In pausa"}
            </span>
            <span
              className={`font-display text-lg tabular-nums ${done ? "text-accent" : "text-foreground"}`}
            >
              {mmss(left)}
            </span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-linear"
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
