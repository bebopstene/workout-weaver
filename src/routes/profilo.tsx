import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Download, Dumbbell, RotateCcw, Timer, TrendingUp, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  doneSets,
  fmtNum,
  importState,
  personalRecords,
  resetAll,
  sessionVolume,
  streak,
  useGym,
} from "@/lib/gym-store";
import { exportCsv, exportJson, exportProgramCsv } from "@/lib/export";
import { parseProgramCsv } from "@/lib/program";
import { importProgram, resetProgram } from "@/lib/gym-store";

export const Route = createFileRoute("/profilo")({
  head: () => ({
    meta: [
      { title: "Profilo atleta — Iron Pulse" },
      {
        name: "description",
        content:
          "Statistiche complessive dell'atleta: sessioni, volume totale, serie e streak di allenamento.",
      },
      { property: "og:title", content: "Profilo atleta — Iron Pulse" },
      { property: "og:description", content: "Sessioni, volume totale, serie e streak." },
    ],
  }),
  component: Profilo,
});

function Profilo() {
  const state = useGym();
  const { history } = state;
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const volume = history.reduce((t, s) => t + sessionVolume(s), 0);

  const onImportProgram = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseProgramCsv(String(reader.result));
      if (!result.ok) {
        window.alert(`Scheda non importata.\n\n${result.error}`);
        return;
      }
      const esercizi = result.days.reduce((n, d) => n + d.exercises.length, 0);
      if (
        !window.confirm(
          `Sostituisco la scheda con ${result.days.length} giornate e ${esercizi} esercizi?\n\nLo storico degli allenamenti resta intatto.`,
        )
      )
        return;
      importProgram(result.days, result.weights);
      window.alert("Scheda importata.");
    };
    reader.readAsText(file);
  };

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch {
        window.alert("File non valido: non è un JSON leggibile.");
        return;
      }
      const error = importState(parsed);
      window.alert(error ?? "Backup importato.");
    };
    reader.readAsText(file);
  };
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
          value={`${fmtNum(volume / 1000)} t`}
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
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          I tuoi dati
        </h2>
        <div className="space-y-2">
          <DataButton
            icon={<Download className="size-4" />}
            label="Esporta in CSV"
            hint="Una riga per serie — si apre in Excel, Numbers o Fogli Google"
            disabled={!history.length}
            onClick={() => exportCsv(history, state.program)}
          />
          <DataButton
            icon={<Download className="size-4" />}
            label="Esporta backup (.json)"
            hint="Tutto lo stato, pesi correnti compresi. Si reimporta identico"
            disabled={!history.length}
            onClick={() => exportJson(state)}
          />
          <DataButton
            icon={<Upload className="size-4" />}
            label="Importa backup"
            hint="Sostituisce i dati di questo dispositivo"
            onClick={() => fileRef.current?.click()}
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />

        <h2 className="mb-3 mt-8 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          La tua scheda
        </h2>
        <div className="space-y-2">
          <DataButton
            icon={<Download className="size-4" />}
            label="Esporta scheda (CSV)"
            hint={`${state.program.length} giornate · esporta i pesi attuali, non quelli iniziali`}
            onClick={() => exportProgramCsv(state.program, state.plan)}
          />
          <DataButton
            icon={<Upload className="size-4" />}
            label="Importa scheda (CSV)"
            hint="Sostituisce esercizi, serie, range e recuperi. Lo storico resta"
            onClick={() => csvRef.current?.click()}
          />
        </div>
        <input
          ref={csvRef}
          type="file"
          accept="text/csv,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportProgram(f);
            e.target.value = "";
          }}
        />
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Esporta, modifica il file in un foglio di calcolo e reimporta. Per gli esercizi a tempo
          compila <b>Secondi</b> e lascia vuoto il range di ripetizioni. Se una riga non torna,
          l'import si ferma e ti dice quale.
        </p>
        <button
          onClick={() => {
            if (
              window.confirm("Riporto la scheda e i pesi ai valori originali? Lo storico resta.")
            ) {
              resetProgram();
            }
          }}
          className="mt-3 w-full rounded-lg border border-border py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          Ripristina scheda originale
        </button>

        <button
          onClick={() => {
            if (window.confirm("Cancellare storico e riportare i pesi ai valori della scheda?")) {
              resetAll();
            }
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          <RotateCcw className="size-4" />
          Cancella tutto
        </button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          I dati restano salvati solo su questo dispositivo. Esporta un backup ogni tanto.
        </p>
      </section>
    </AppShell>
  );
}

function DataButton({
  icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-[11px] leading-tight text-muted-foreground">{hint}</span>
      </span>
    </button>
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
