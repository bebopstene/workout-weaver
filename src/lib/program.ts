import { PLAN, type DayDef, type ExerciseDef } from "@/lib/plan";
import type { PlanState } from "@/lib/gym-store";

/**
 * Scheda importabile ed esportabile come CSV.
 *
 * Il giro è pensato per essere fatto in un foglio di calcolo: esporti, cambi
 * quello che ti serve, reimporti. Per questo il CSV esporta il peso **attuale**
 * e non quello di partenza — un file che mostrasse i 55 kg iniziali quando ne
 * stai facendo 70 sarebbe fuorviante da modificare.
 *
 * L'import è severo di proposito: un errore in una riga blocca tutto e viene
 * segnalato con il numero di riga. Sostituire la scheda a metà lascerebbe un
 * programma incoerente, e ci si accorgerebbe del problema in palestra.
 */

export const PROGRAM_COLUMNS = [
  "Giorno",
  "Esercizio",
  "Attrezzo",
  "Serie",
  "Rip. min",
  "Rip. max",
  "Secondi",
  "Recupero (s)",
  "Peso (kg)",
  "Incremento (kg)",
] as const;

const cell = (v: string | number | null | undefined) => {
  if (v == null || v === "") return "";
  const s = String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function programToCsv(days: DayDef[], plan: Record<string, PlanState>): string {
  const rows = [PROGRAM_COLUMNS.join(",")];
  for (const day of days) {
    for (const e of day.exercises) {
      const cur = plan[`${day.id}.${e.id}`];
      rows.push(
        [
          cell(day.name),
          cell(e.name),
          cell(e.equipment),
          cell(e.sets),
          cell(cur?.repMin ?? e.repMin),
          cell(cur?.repMax ?? e.repMax),
          cell(cur?.seconds ?? e.seconds),
          cell(e.rest),
          cell(cur?.weight ?? e.weight),
          cell(e.increment),
        ].join(","),
      );
    }
  }
  return rows.join("\n");
}

/** Divide una riga CSV rispettando le virgolette. */
function splitRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === "," || ch === ";") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** `nome giornata` → id stabile, riusando quelli della scheda quando il nome coincide. */
function dayIdFor(name: string, used: Map<string, string>): string {
  const known = PLAN.find((d) => d.name.toLowerCase() === name.toLowerCase());
  if (known) return known.id;
  const existing = used.get(name.toLowerCase());
  if (existing) return existing;
  const slug =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "giorno";
  return slug;
}

/** Id esercizio riusato se il nome coincide con uno della scheda: mantiene lo storico agganciato. */
function exerciseIdFor(dayId: string, name: string, taken: Set<string>): string {
  const known = PLAN.find((d) => d.id === dayId)?.exercises.find(
    (e) => e.name.toLowerCase() === name.toLowerCase(),
  );
  if (known && !taken.has(known.id)) return known.id;
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "esercizio";
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

export type ParseResult =
  { ok: true; days: DayDef[]; weights: Record<string, number> } | { ok: false; error: string };

const PALETTE = ["#ff6b4a", "#5b9dff", "#a97bff", "#3ddc84", "#ffc247"];
const EMOJI = ["🏋🏾‍♀️", "🦵🏾", "💪🏾", "🔥", "⚡"];

export function parseProgramCsv(text: string): ParseResult {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");

  if (lines.length < 2)
    return { ok: false, error: "Il file è vuoto o contiene solo l'intestazione." };

  const header = splitRow(lines[0]!);
  if (header.length < PROGRAM_COLUMNS.length) {
    return {
      ok: false,
      error: `L'intestazione ha ${header.length} colonne invece di ${PROGRAM_COLUMNS.length}. Esporta la scheda per avere il formato giusto.`,
    };
  }

  const days: DayDef[] = [];
  const dayIds = new Map<string, string>();
  const takenPerDay = new Map<string, Set<string>>();
  const weights: Record<string, number> = {};

  for (let i = 1; i < lines.length; i++) {
    const riga = i + 1; // numero di riga come lo vede l'utente nel foglio
    const c = splitRow(lines[i]!);

    const [
      dayName,
      exName,
      equipment,
      setsRaw,
      minRaw,
      maxRaw,
      secRaw,
      restRaw,
      weightRaw,
      incRaw,
    ] = c;

    if (!dayName) return { ok: false, error: `Riga ${riga}: manca il nome della giornata.` };
    if (!exName) return { ok: false, error: `Riga ${riga}: manca il nome dell'esercizio.` };

    const num = (raw: string | undefined, label: string, min: number): number | string => {
      const v = Number(String(raw ?? "").replace(",", "."));
      if (!Number.isFinite(v)) return `Riga ${riga}: "${label}" non è un numero ("${raw}").`;
      if (v < min) return `Riga ${riga}: "${label}" non può essere minore di ${min}.`;
      return v;
    };

    const sets = num(setsRaw, "Serie", 1);
    if (typeof sets === "string") return { ok: false, error: sets };
    const rest = num(restRaw, "Recupero (s)", 0);
    if (typeof rest === "string") return { ok: false, error: rest };
    const weight = num(weightRaw, "Peso (kg)", 0);
    if (typeof weight === "string") return { ok: false, error: weight };
    const increment = num(incRaw, "Incremento (kg)", 0);
    if (typeof increment === "string") return { ok: false, error: increment };

    const hasSeconds = String(secRaw ?? "").trim() !== "";
    const hasRange = String(minRaw ?? "").trim() !== "" && String(maxRaw ?? "").trim() !== "";

    if (hasSeconds && hasRange) {
      return {
        ok: false,
        error: `Riga ${riga}: compila "Secondi" oppure il range di ripetizioni, non entrambi. Un esercizio o si tiene a tempo o si conta a ripetizioni.`,
      };
    }
    if (!hasSeconds && !hasRange) {
      return {
        ok: false,
        error: `Riga ${riga}: serve il range di ripetizioni ("Rip. min" e "Rip. max") oppure "Secondi".`,
      };
    }

    let repMin: number | null = null;
    let repMax: number | null = null;
    let seconds: number | null = null;

    if (hasSeconds) {
      const s = num(secRaw, "Secondi", 1);
      if (typeof s === "string") return { ok: false, error: s };
      seconds = s;
    } else {
      const a = num(minRaw, "Rip. min", 1);
      if (typeof a === "string") return { ok: false, error: a };
      const b = num(maxRaw, "Rip. max", 1);
      if (typeof b === "string") return { ok: false, error: b };
      if (b < a) {
        return {
          ok: false,
          error: `Riga ${riga}: "Rip. max" (${b}) è minore di "Rip. min" (${a}).`,
        };
      }
      repMin = a;
      repMax = b;
    }

    const dayId = dayIdFor(dayName, dayIds);
    dayIds.set(dayName.toLowerCase(), dayId);

    let day = days.find((d) => d.id === dayId);
    if (!day) {
      const idx = days.length;
      day = {
        id: dayId,
        name: dayName,
        emoji: PLAN.find((d) => d.id === dayId)?.emoji ?? EMOJI[idx % EMOJI.length]!,
        color: PLAN.find((d) => d.id === dayId)?.color ?? PALETTE[idx % PALETTE.length]!,
        exercises: [],
      };
      days.push(day);
      takenPerDay.set(dayId, new Set());
    }

    const taken = takenPerDay.get(dayId)!;
    const exId = exerciseIdFor(dayId, exName, taken);
    taken.add(exId);

    const def: ExerciseDef = {
      id: exId,
      name: exName,
      equipment: equipment ?? "",
      sets,
      rest,
      repMin,
      repMax,
      seconds,
      weight,
      increment,
    };
    day.exercises.push(def);
    weights[`${dayId}.${exId}`] = weight;
  }

  if (!days.length) return { ok: false, error: "Nessuna riga valida trovata." };
  return { ok: true, days, weights };
}
