/**
 * La scheda vera, trasferita dall'app Palestra.
 *
 * Gli `id` sono identici a quelli della vecchia app (`petto.panca`, `gambe.squat`, …)
 * perché la migrazione dello storico li usa come chiave: cambiarli spezzerebbe
 * il collegamento con i dati già registrati sul telefono.
 *
 * `repMin`/`repMax` sono il range della double progression. Gli esercizi isometrici
 * hanno `seconds` al posto del range e progrediscono sul tempo, non sul carico.
 * `increment` è di quanto sale il peso quando il range viene chiuso: dipende
 * dall'attrezzo, perché un bilanciere sale di 5 kg e un manubrio di 1.
 */

export type ExerciseDef = {
  id: string;
  name: string;
  equipment: string;
  /** Serie previste. */
  sets: number;
  /** Recupero in secondi. */
  rest: number;
  repMin: number | null;
  repMax: number | null;
  /** Secondi da tenere, per gli isometrici. Esclude repMin/repMax. */
  seconds: number | null;
  /** Peso di partenza in kg. 0 per il corpo libero. */
  weight: number;
  /** Incremento in kg quando il range è chiuso. 0 = non progredisce sul carico. */
  increment: number;
};

export type DayDef = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  exercises: ExerciseDef[];
};

const ex = (
  id: string,
  name: string,
  equipment: string,
  sets: number,
  rest: number,
  weight: number,
  increment: number,
  reps: [number, number] | null,
  seconds: number | null = null,
): ExerciseDef => ({
  id,
  name,
  equipment,
  sets,
  rest,
  weight,
  increment,
  repMin: reps ? reps[0] : null,
  repMax: reps ? reps[1] : null,
  seconds,
});

export const PLAN: DayDef[] = [
  {
    id: "petto",
    name: "Petto + Spalle",
    emoji: "🏋🏾‍♀️",
    color: "#ff6b4a",
    exercises: [
      ex("panca", "Panca Piana con Bilanciere", "Bilanciere", 4, 180, 55, 5, [8, 10]),
      ex("inclin", "Panca Inclinata (Manubri)", "Manubri", 3, 120, 12, 1, [8, 10]),
      ex("military", "Military Press (Bilanciere)", "Bilanciere", 4, 150, 10, 1, [8, 10]),
      ex("alzate", "Alzate Laterali", "Manubri", 3, 60, 6, 1, [10, 12]),
      ex("alzateb", "Alzate Laterali · burnout", "Manubri", 1, 45, 2, 1, [15, 20]),
      ex("dip", "Dip Parallele o Pushdown", "Corpo libero", 3, 60, 0, 2.5, [8, 10]),
      ex("dragon", "Dragonfly Abs", "Corpo libero", 3, 60, 0, 0, [12, 14]),
      ex("sideplk", "Side Plank", "Corpo libero", 3, 60, 0, 0, null, 45),
    ],
  },
  {
    id: "gambe",
    name: "Gambe",
    emoji: "🦵🏾",
    color: "#5b9dff",
    exercises: [
      ex("squat", "Squat con Bilanciere", "Bilanciere", 4, 180, 55, 5, [8, 10]),
      ex("legpress", "Leg Press", "Macchina", 3, 120, 50, 5, [8, 10]),
      ex("hipthrust", "Hip Thrust", "Bilanciere", 3, 90, 60, 2.5, [10, 12]),
      ex("bulgarian", "Bulgarian Split Squat", "Kettlebell", 3, 120, 12, 1, [8, 10]),
      ex("legext", "Leg Extension", "Macchina", 3, 60, 35, 2.5, [12, 14]),
      ex("legcurl", "Leg Curl", "Macchina", 3, 60, 40, 2.5, [10, 12]),
      ex("kbswing", "Kettlebell Swing", "Kettlebell", 4, 180, 14, 2, [12, 15]),
      ex("calf", "Calf Raise in piedi", "Corpo libero", 3, 60, 0, 1, [15, 18]),
    ],
  },
  {
    id: "schiena",
    name: "Schiena + Braccia",
    emoji: "💪🏾",
    color: "#a97bff",
    exercises: [
      ex("trazioni", "Trazioni o Lat Machine", "Corpo libero", 4, 150, 0, 2.5, [6, 8]),
      ex("rematore", "Rematore con Bilanciere", "Bilanciere", 4, 120, 40, 2.5, [8, 10]),
      ex("rdl", "Romanian Deadlift", "Bilanciere", 4, 150, 50, 2.5, [8, 10]),
      ex("pullover", "Cable Pullover", "Cavi", 3, 90, 30, 2.5, [12, 14]),
      ex("curl", "Curl Bilanciere", "Bil. curvo", 3, 90, 10, 1, [8, 10]),
      ex("russian", "Russian Twist", "Corpo libero", 3, 45, 8, 2, [15, 18]),
      ex("plank", "Plank Standard", "Corpo libero", 3, 60, 0, 0, null, 70),
    ],
  },
];

/** Chiave usata sia per lo stato di progressione sia dalla migrazione da `palestra_v1`. */
export const planKey = (dayId: string, exerciseId: string) => `${dayId}.${exerciseId}`;

export const findDay = (dayId: string) => PLAN.find((d) => d.id === dayId);

export const findExercise = (dayId: string, exerciseId: string) =>
  findDay(dayId)?.exercises.find((e) => e.id === exerciseId);

/** Etichetta del bersaglio: "8–10 rip" oppure "45s". */
export const targetLabel = (d: Pick<ExerciseDef, "repMin" | "repMax" | "seconds">) =>
  d.seconds != null ? `${d.seconds}s` : `${d.repMin}–${d.repMax} rip`;
