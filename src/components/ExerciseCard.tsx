import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { addSet, removeSet, setExerciseWeight, updateSet, type Exercise } from "@/lib/gym-store";

function NumberField({
  label,
  value,
  step,
  suffix,
  onChange,
  emphasis,
}: {
  label: string;
  value: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
  emphasis: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-2 py-1 ${emphasis ? "bg-accent-foreground/15" : "bg-background/40"}`}
    >
      <div
        className={`text-[10px] font-bold uppercase ${
          emphasis ? "text-accent-foreground/70" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
      <div className="flex items-center gap-1">
        <button
          aria-label={`Diminuisci ${label}`}
          onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))}
          className={`shrink-0 rounded p-0.5 ${emphasis ? "text-accent-foreground/60" : "text-muted-foreground"}`}
        >
          <Minus className="size-3" />
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full min-w-0 bg-transparent text-center font-display text-base outline-none ${
            emphasis ? "text-accent-foreground" : "text-foreground"
          }`}
        />
        <button
          aria-label={`Aumenta ${label}`}
          onClick={() => onChange(+(value + step).toFixed(2))}
          className={`shrink-0 rounded p-0.5 ${emphasis ? "text-accent-foreground/60" : "text-muted-foreground"}`}
        >
          <Plus className="size-3" />
        </button>
      </div>
      {suffix && (
        <div
          className={`text-right text-[9px] ${
            emphasis ? "text-accent-foreground/60" : "text-muted-foreground"
          }`}
        >
          {suffix}
        </div>
      )}
    </div>
  );
}

export function ExerciseCard({
  exercise,
  activeSetId,
  onComplete,
}: {
  exercise: Exercise;
  activeSetId: string | null;
  onComplete: (restSeconds: number) => void;
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h3 className="truncate text-lg font-bold">{exercise.name}</h3>
        <span className="shrink-0 rounded border border-border bg-card px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
          Rec {exercise.restSeconds}s
        </span>
      </div>

      <div className="space-y-2">
        {exercise.sets.map((set, i) => {
          const isActive = set.id === activeSetId;

          if (set.done) {
            return (
              <div
                key={set.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10">
                  <span className="text-xs font-bold text-accent">{i + 1}</span>
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-4">
                  {!exercise.timed && (
                    <div>
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">
                        Peso
                      </div>
                      <div className="font-display">
                        {set.weight}
                        <span className="ml-1 font-sans text-[10px] text-muted-foreground">KG</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">
                      {exercise.timed ? "Tenuta" : "Reps"}
                    </div>
                    <div className="font-display text-accent">
                      {set.reps}
                      {exercise.timed && "s"}
                    </div>
                  </div>
                </div>
                <button
                  aria-label="Annulla serie"
                  onClick={() => updateSet(exercise.id, set.id, { done: false })}
                  className="flex size-6 shrink-0 items-center justify-center rounded bg-accent"
                >
                  <Check className="size-4 text-accent-foreground" strokeWidth={3} />
                </button>
              </div>
            );
          }

          if (isActive) {
            return (
              <div
                key={set.id}
                className="flex items-center gap-3 rounded-xl border border-accent bg-accent p-3 shadow-[0_8px_32px_-12px_var(--accent)]"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background">
                  <span className="text-xs font-bold text-accent">{i + 1}</span>
                </div>
                <div
                  className={`grid min-w-0 flex-1 gap-2 ${exercise.timed ? "grid-cols-1" : "grid-cols-2"}`}
                >
                  {!exercise.timed && (
                    <NumberField
                      label="Peso"
                      value={set.weight}
                      step={2.5}
                      suffix="kg"
                      emphasis
                      onChange={(v) => setExerciseWeight(exercise.id, v)}
                    />
                  )}
                  <NumberField
                    label={exercise.timed ? "Secondi" : "Reps"}
                    value={set.reps}
                    step={exercise.timed ? 5 : 1}
                    suffix={`obiettivo ${exercise.targetReps}`}
                    emphasis
                    onChange={(v) => updateSet(exercise.id, set.id, { reps: v })}
                  />
                </div>
                <button
                  onClick={() => {
                    updateSet(exercise.id, set.id, { done: true });
                    onComplete(exercise.restSeconds);
                  }}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background transition-transform active:scale-90"
                  aria-label="Completa serie"
                >
                  <Check className="size-5 text-accent" strokeWidth={3} />
                </button>
              </div>
            );
          }

          return (
            <div
              key={set.id}
              className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-3"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border">
                <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
              </div>
              <div className="min-w-0 flex-1 truncate text-sm italic text-muted-foreground">
                {exercise.timed
                  ? `Obiettivo: ${exercise.targetReps}`
                  : `Obiettivo: ${set.weight} kg × ${exercise.targetReps}`}
              </div>
              <button
                aria-label="Elimina serie"
                onClick={() => removeSet(exercise.id, set.id)}
                className="shrink-0 text-muted-foreground/60 transition-colors hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}

        <button
          onClick={() => addSet(exercise.id)}
          className="w-full rounded-xl border border-dashed border-border py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent"
        >
          + Aggiungi serie
        </button>
      </div>
    </section>
  );
}
