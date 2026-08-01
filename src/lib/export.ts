import { findExercise } from "@/lib/plan";
import type { GymState, Session } from "@/lib/gym-store";

/**
 * Esportazione dei dati in due formati, con scopi diversi.
 *
 * Il CSV è per guardare i numeri altrove: si apre in Excel, Numbers o Fogli
 * Google e ha una riga per serie, che è il grano giusto per farci tabelle
 * pivot e grafici. È una fotografia, non un formato di ritorno.
 *
 * Il JSON è il backup vero: contiene tutto lo stato, pesi correnti compresi,
 * e si reimporta identico. È quello da conservare se cambi telefono.
 */

/** Un campo CSV va quotato se contiene separatori, virgolette o a capo. */
function cell(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const s = String(value);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const clock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const COLUMNS = [
  "Data",
  "Ora",
  "Giorno",
  "Esercizio",
  "Attrezzo",
  "Serie",
  "Peso (kg)",
  "Ripetizioni",
  "Secondi",
  "Volume (kg)",
];

/** Una riga per serie completata, dalla più recente alla più vecchia. */
export function historyToCsv(history: Session[]): string {
  const rows: string[] = [COLUMNS.join(",")];

  for (const s of [...history].sort((a, b) => +new Date(a.date) - +new Date(b.date))) {
    const d = new Date(s.date);
    for (const e of s.exercises) {
      const def = findExercise(s.dayId, e.defId);
      let n = 0;
      for (const set of e.sets) {
        if (!set.done) continue;
        n++;
        rows.push(
          [
            cell(iso(d)),
            cell(clock(d)),
            cell(s.name),
            cell(e.name),
            cell(def?.equipment ?? ""),
            cell(n),
            cell(e.timed ? "" : set.weight),
            cell(e.timed ? "" : set.reps),
            cell(e.timed ? set.reps : ""),
            cell(e.timed ? "" : Math.round(set.weight * set.reps)),
          ].join(","),
        );
      }
    }
  }
  return rows.join("\n");
}

export function download(filename: string, content: string, mime: string) {
  // Il BOM serve a Excel per riconoscere l'UTF-8: senza, le accentate
  // arrivano scombinate e "Panca Inclinata" diventa illeggibile.
  const blob = new Blob([mime.startsWith("text/csv") ? "﻿" + content : content], {
    type: `${mime};charset=utf-8`,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const stamp = () => iso(new Date());

export function exportCsv(history: Session[]) {
  download(`allenamenti-${stamp()}.csv`, historyToCsv(history), "text/csv");
}

export function exportJson(state: GymState) {
  // Le proposte in sospeso sono un fatto momentaneo, non un dato da conservare.
  const { proposals: _proposals, ...rest } = state;
  download(`backup-allenamenti-${stamp()}.json`, JSON.stringify(rest, null, 1), "application/json");
}

