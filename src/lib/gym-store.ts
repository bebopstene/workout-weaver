import { useSyncExternalStore } from "react";
import { PLAN, findDay, findExercise, planKey, targetLabel, type ExerciseDef } from "@/lib/plan";

export type WorkoutSet = {
  id: string;
  weight: number;
  /** Per gli esercizi a tempo contiene i secondi tenuti, non le ripetizioni. */
  reps: number;
  done: boolean;
};

export type Exercise = {
  id: string;
  /** Id nella scheda, stabile tra le sessioni: serve a confrontare i progressi. */
  defId: string;
  name: string;
  restSeconds: number;
  targetReps: string;
  timed: boolean;
  plannedSets: number;
  repMin: number | null;
  repMax: number | null;
  seconds: number | null;
  sets: WorkoutSet[];
};

export type Session = {
  id: string;
  dayId: string;
  name: string;
  date: string;
  startedAt: number;
  finishedAt?: number;
  exercises: Exercise[];
};

/** Stato corrente di un esercizio: è ciò che la double progression fa salire. */
export type PlanState = {
  weight: number;
  repMin: number | null;
  repMax: number | null;
  seconds: number | null;
};

export type Proposal = {
  key: string;
  name: string;
  kind: "weight" | "seconds" | "reps";
  description: string;
  apply: PlanState;
};

export type GymState = {
  active: Session | null;
  history: Session[];
  plan: Record<string, PlanState>;
  /** Aumenti proposti a fine sessione, in attesa di conferma. */
  proposals: Proposal[];
};

const KEY = "iron-pulse-state-v1";

const uid = () => Math.random().toString(36).slice(2, 10);

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Scheda al valore di partenza: nessuno storico, nessun dato inventato. */
export function emptyState(): GymState {
  const plan: Record<string, PlanState> = {};
  for (const day of PLAN) {
    for (const e of day.exercises) {
      plan[planKey(day.id, e.id)] = {
        weight: e.weight,
        repMin: e.repMin,
        repMax: e.repMax,
        seconds: e.seconds,
      };
    }
  }
  return { active: null, history: [], plan, proposals: [] };
}

let state: GymState = emptyState();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<GymState>;
      const base = emptyState();
      state = {
        active: stored.active ?? null,
        history: stored.history ?? [],
        // I pesi salvati vincono, ma un esercizio aggiunto alla scheda dopo
        // deve comunque comparire: per questo si parte dai valori base.
        plan: { ...base.plan, ...(stored.plan ?? {}) },
        proposals: stored.proposals ?? [],
      };
    }
  } catch {
    /* corrupt payload */
  }
  emit();
}

function setState(next: GymState) {
  state = next;
  persist();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const getSnapshot = () => state;

export function useGym() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export { PLAN, targetLabel } from "@/lib/plan";

/* ==================== sessione ==================== */

function buildExercise(dayId: string, def: ExerciseDef, plan: Record<string, PlanState>): Exercise {
  const p = plan[planKey(dayId, def.id)] ?? {
    weight: def.weight,
    repMin: def.repMin,
    repMax: def.repMax,
    seconds: def.seconds,
  };
  const timed = p.seconds != null;
  // Le serie partono dal fondo del range: è il punto da cui si risale dopo un aumento.
  const startReps = timed ? p.seconds! : (p.repMin ?? 8);
  return {
    id: uid(),
    defId: def.id,
    name: def.name,
    restSeconds: def.rest,
    targetReps: targetLabel(p),
    timed,
    plannedSets: def.sets,
    repMin: p.repMin,
    repMax: p.repMax,
    seconds: p.seconds,
    sets: Array.from({ length: def.sets }, () => ({
      id: uid(),
      weight: p.weight,
      reps: startReps,
      done: false,
    })),
  };
}

export function startSession(dayId: string) {
  const day = findDay(dayId);
  if (!day) return;
  const session: Session = {
    id: uid(),
    dayId,
    name: day.name,
    date: new Date().toISOString(),
    startedAt: Date.now(),
    exercises: day.exercises.map((def) => buildExercise(dayId, def, state.plan)),
  };
  setState({ ...state, active: session });
}

function mapActive(fn: (s: Session) => Session) {
  if (!state.active) return;
  setState({ ...state, active: fn(state.active) });
}

export function updateSet(exerciseId: string, setId: string, patch: Partial<WorkoutSet>) {
  mapActive((s) => ({
    ...s,
    exercises: s.exercises.map((e) =>
      e.id !== exerciseId
        ? e
        : { ...e, sets: e.sets.map((st) => (st.id === setId ? { ...st, ...patch } : st)) },
    ),
  }));
}

/** Cambiare il peso durante la sessione lo applica a tutte le serie non ancora fatte. */
export function setExerciseWeight(exerciseId: string, weight: number) {
  const w = Math.max(0, round2(weight));
  mapActive((s) => ({
    ...s,
    exercises: s.exercises.map((e) =>
      e.id !== exerciseId
        ? e
        : { ...e, sets: e.sets.map((st) => (st.done ? st : { ...st, weight: w })) },
    ),
  }));
}

export function addSet(exerciseId: string) {
  mapActive((s) => ({
    ...s,
    exercises: s.exercises.map((e) => {
      if (e.id !== exerciseId) return e;
      const last = e.sets.at(-1);
      return {
        ...e,
        sets: [
          ...e.sets,
          { id: uid(), weight: last?.weight ?? 0, reps: last?.reps ?? 10, done: false },
        ],
      };
    }),
  }));
}

export function removeSet(exerciseId: string, setId: string) {
  mapActive((s) => ({
    ...s,
    exercises: s.exercises.map((e) =>
      e.id !== exerciseId ? e : { ...e, sets: e.sets.filter((st) => st.id !== setId) },
    ),
  }));
}

/**
 * Double progression: il carico sale solo dopo aver chiuso **tutte** le serie
 * previste al tetto del range. Gli isometrici salgono di 5 secondi.
 * Gli esercizi senza incremento (addominali a corpo libero) spostano il range.
 */
export function progressionProposals(
  session: Session,
  plan: Record<string, PlanState>,
): Proposal[] {
  const out: Proposal[] = [];
  for (const e of session.exercises) {
    const def = findExercise(session.dayId, e.defId);
    if (!def) continue;
    const key = planKey(session.dayId, e.defId);
    const cur = plan[key];
    if (!cur) continue;

    const done = e.sets.filter((s) => s.done);
    if (done.length < e.plannedSets) continue;

    if (e.timed && cur.seconds != null) {
      if (done.every((s) => s.reps >= cur.seconds!)) {
        const to = cur.seconds + 5;
        out.push({
          key,
          name: e.name,
          kind: "seconds",
          description: `tutte le serie a ${cur.seconds}s → passa a ${to}s`,
          apply: { ...cur, seconds: to },
        });
      }
      continue;
    }

    if (cur.repMax == null || !done.every((s) => s.reps >= cur.repMax!)) continue;

    if (def.increment > 0) {
      const to = round2(cur.weight + def.increment);
      out.push({
        key,
        name: e.name,
        kind: "weight",
        description: `${e.plannedSets}×${cur.repMax} completate → ${cur.weight} kg diventa ${to} kg`,
        apply: { ...cur, weight: to },
      });
    } else {
      out.push({
        key,
        name: e.name,
        kind: "reps",
        description: `range ${cur.repMin}–${cur.repMax} chiuso → passa a ${(cur.repMin ?? 0) + 1}–${cur.repMax + 1} rip`,
        apply: { ...cur, repMin: (cur.repMin ?? 0) + 1, repMax: cur.repMax + 1 },
      });
    }
  }
  return out;
}

export function finishSession() {
  if (!state.active) return;
  const done: Session = {
    ...state.active,
    finishedAt: Date.now(),
    exercises: state.active.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length > 0),
  };
  if (!done.exercises.length) {
    setState({ ...state, active: null, proposals: [] });
    return;
  }
  setState({
    active: null,
    history: [done, ...state.history],
    plan: state.plan,
    proposals: progressionProposals(state.active, state.plan),
  });
}

/** Applica gli aumenti scelti. `keys` vuoto = salva senza cambiare i pesi. */
export function applyProposals(keys: string[]) {
  const chosen = new Set(keys);
  const plan = { ...state.plan };
  for (const p of state.proposals) {
    if (chosen.has(p.key)) plan[p.key] = p.apply;
  }
  setState({ ...state, plan, proposals: [] });
}

export function dismissProposals() {
  setState({ ...state, proposals: [] });
}

export function discardSession() {
  setState({ ...state, active: null });
}

/** Riporta i pesi ai valori della scheda. Lo storico resta. */
export function resetPlan() {
  setState({ ...state, plan: emptyState().plan });
}

export function resetAll() {
  setState(emptyState());
}

/* ==================== statistiche ==================== */

export const sessionVolume = (s: Session) =>
  s.exercises.reduce(
    (tot, e) =>
      tot + (e.timed ? 0 : e.sets.filter((x) => x.done).reduce((t, x) => t + x.weight * x.reps, 0)),
    0,
  );

export const doneSets = (s: Session) =>
  s.exercises.reduce((t, e) => t + e.sets.filter((x) => x.done).length, 0);

export const totalSets = (s: Session) => s.exercises.reduce((t, e) => t + e.sets.length, 0);

export const oneRm = (weight: number, reps: number) => Math.round(weight * (1 + reps / 30));

export function personalRecords(history: Session[]) {
  const map = new Map<
    string,
    { name: string; weight: number; reps: number; date: string; rm: number }
  >();
  for (const s of history) {
    for (const e of s.exercises) {
      if (e.timed) continue;
      for (const st of e.sets) {
        if (!st.done) continue;
        const rm = oneRm(st.weight, st.reps);
        const cur = map.get(e.name);
        if (!cur || rm > cur.rm) {
          map.set(e.name, { name: e.name, weight: st.weight, reps: st.reps, date: s.date, rm });
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.rm - a.rm);
}

export function weeklyVolume(history: Session[], active: Session | null) {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  monday.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"][i]!,
      date: d,
      volume: 0,
      isToday: i === dow,
    };
  });

  const all = active ? [active, ...history] : history;
  for (const s of all) {
    const d = new Date(s.date);
    const idx = days.findIndex((x) => x.date.toDateString() === d.toDateString());
    if (idx >= 0) days[idx]!.volume += sessionVolume(s);
  }
  return days;
}

export function weeklyDelta(history: Session[], active: Session | null) {
  const now = Date.now();
  const week = 7 * 24 * 3600 * 1000;
  const all = active ? [active, ...history] : history;
  const sum = (from: number, to: number) =>
    all
      .filter((s) => {
        const t = new Date(s.date).getTime();
        return t >= from && t < to;
      })
      .reduce((t, s) => t + sessionVolume(s), 0);
  const cur = sum(now - week, now + 1);
  const prev = sum(now - 2 * week, now - week);
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

export function streak(history: Session[]) {
  const dates = new Set(history.map((s) => new Date(s.date).toDateString()));
  let count = 0;
  const cursor = new Date();
  if (!dates.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(cursor.toDateString())) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export const fmtDuration = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

/** Locale-independent so SSR and client render identically. */
export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`;
};

export const fmtNum = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
