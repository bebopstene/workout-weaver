import { useSyncExternalStore } from "react";

export type WorkoutSet = {
  id: string;
  weight: number;
  reps: number;
  done: boolean;
};

export type Exercise = {
  id: string;
  name: string;
  restSeconds: number;
  targetReps: string;
  sets: WorkoutSet[];
};

export type Session = {
  id: string;
  name: string;
  date: string;
  startedAt: number;
  finishedAt?: number;
  exercises: Exercise[];
};

export type GymState = {
  active: Session | null;
  history: Session[];
};

const KEY = "iron-pulse-state-v1";

const uid = () => Math.random().toString(36).slice(2, 10);

export const TEMPLATES: {
  name: string;
  exercises: { name: string; sets: number; weight: number; reps: number; rest: number; target: string }[];
}[] = [
  {
    name: "Spinta — Petto & Spalle",
    exercises: [
      { name: "Panca Piana Bilanciere", sets: 4, weight: 80, reps: 8, rest: 120, target: "8-10" },
      { name: "Military Press", sets: 3, weight: 45, reps: 8, rest: 90, target: "8-10" },
      { name: "Croci ai Cavi", sets: 3, weight: 15, reps: 12, rest: 60, target: "12-15" },
      { name: "Push Down Tricipiti", sets: 3, weight: 30, reps: 12, rest: 60, target: "12-15" },
    ],
  },
  {
    name: "Tirata — Dorso & Bicipiti",
    exercises: [
      { name: "Stacco da Terra", sets: 4, weight: 120, reps: 5, rest: 180, target: "4-6" },
      { name: "Trazioni Zavorrate", sets: 4, weight: 10, reps: 6, rest: 120, target: "6-8" },
      { name: "Rematore Bilanciere", sets: 3, weight: 70, reps: 10, rest: 90, target: "8-12" },
      { name: "Curl Manubri", sets: 3, weight: 14, reps: 12, rest: 60, target: "10-12" },
    ],
  },
  {
    name: "Gambe & Potenza",
    exercises: [
      { name: "Squat con Bilanciere", sets: 5, weight: 125, reps: 5, rest: 180, target: "5" },
      { name: "Pressa 45°", sets: 4, weight: 200, reps: 10, rest: 120, target: "10-12" },
      { name: "Leg Curl", sets: 3, weight: 45, reps: 12, rest: 60, target: "12-15" },
      { name: "Calf Raise", sets: 4, weight: 60, reps: 15, rest: 45, target: "15-20" },
    ],
  },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(18, 30, 0, 0);
  return d;
}

function seedSession(templateIndex: number, days: number, factor: number): Session {
  const t = TEMPLATES[templateIndex]!;
  const date = daysAgo(days);
  return {
    id: uid(),
    name: t.name,
    date: date.toISOString(),
    startedAt: date.getTime(),
    finishedAt: date.getTime() + 1000 * 60 * (52 + templateIndex * 4),
    exercises: t.exercises.map((e) => ({
      id: uid(),
      name: e.name,
      restSeconds: e.rest,
      targetReps: e.target,
      sets: Array.from({ length: e.sets }, () => ({
        id: uid(),
        weight: Math.round(e.weight * factor * 2) / 2,
        reps: e.reps,
        done: true,
      })),
    })),
  };
}

function seed(): GymState {
  return {
    active: null,
    history: [
      seedSession(0, 2, 1),
      seedSession(1, 4, 0.98),
      seedSession(2, 6, 0.96),
      seedSession(0, 9, 0.94),
      seedSession(1, 11, 0.92),
      seedSession(2, 13, 0.9),
    ],
  };
}

let state: GymState = seed();
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
      state = JSON.parse(raw) as GymState;
    } else {
      persist();
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

export function startSession(templateIndex: number) {
  const t = TEMPLATES[templateIndex]!;
  const prev = state.history[0];
  const session: Session = {
    id: uid(),
    name: t.name,
    date: new Date().toISOString(),
    startedAt: Date.now(),
    exercises: t.exercises.map((e) => {
      const last = prev?.exercises.find((x) => x.name === e.name);
      const weight = last?.sets.at(-1)?.weight ?? e.weight;
      return {
        id: uid(),
        name: e.name,
        restSeconds: e.rest,
        targetReps: e.target,
        sets: Array.from({ length: e.sets }, () => ({
          id: uid(),
          weight,
          reps: e.reps,
          done: false,
        })),
      };
    }),
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

export function addSet(exerciseId: string) {
  mapActive((s) => ({
    ...s,
    exercises: s.exercises.map((e) => {
      if (e.id !== exerciseId) return e;
      const last = e.sets.at(-1);
      return {
        ...e,
        sets: [...e.sets, { id: uid(), weight: last?.weight ?? 20, reps: last?.reps ?? 10, done: false }],
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

export function finishSession() {
  if (!state.active) return;
  const done: Session = {
    ...state.active,
    finishedAt: Date.now(),
    exercises: state.active.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length > 0),
  };
  setState({
    active: null,
    history: done.exercises.length ? [done, ...state.history] : state.history,
  });
}

export function discardSession() {
  setState({ ...state, active: null });
}

export function resetAll() {
  setState(seed());
}

export const sessionVolume = (s: Session) =>
  s.exercises.reduce(
    (tot, e) => tot + e.sets.filter((x) => x.done).reduce((t, x) => t + x.weight * x.reps, 0),
    0,
  );

export const doneSets = (s: Session) =>
  s.exercises.reduce((t, e) => t + e.sets.filter((x) => x.done).length, 0);

export const totalSets = (s: Session) => s.exercises.reduce((t, e) => t + e.sets.length, 0);

export const oneRm = (weight: number, reps: number) => Math.round(weight * (1 + reps / 30));

export function personalRecords(history: Session[]) {
  const map = new Map<string, { name: string; weight: number; reps: number; date: string; rm: number }>();
  for (const s of history) {
    for (const e of s.exercises) {
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