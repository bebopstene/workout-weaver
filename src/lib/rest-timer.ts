/**
 * Aritmetica del timer di recupero, separata dal componente per poterla
 * verificare con un orologio finto.
 *
 * Il punto di tutto: i secondi restanti si ricavano da un istante di fine e
 * dall'ora corrente, mai contando quanti tick sono passati. Quando lo schermo
 * si spegne il browser rallenta o sospende i timer, e un contatore a tick
 * perde esattamente il tempo che dovrebbe misurare.
 */

/** Secondi mancanti. `frozenMs` valorizzato = timer in pausa. */
export function secondsLeft(now: number, endAt: number, frozenMs: number | null): number {
  return Math.max(0, Math.ceil((frozenMs ?? endAt - now) / 1000));
}

/** Millisecondi da congelare quando si mette in pausa. */
export function freeze(now: number, endAt: number): number {
  return Math.max(0, endAt - now);
}

/** Nuovo istante di fine quando si riprende. */
export function thaw(now: number, frozenMs: number): number {
  return now + frozenMs;
}

/** Percentuale di recupero già trascorsa, per la barra di avanzamento. */
export function elapsedPct(totalSeconds: number, leftSeconds: number): number {
  if (!totalSeconds) return 100;
  return ((totalSeconds - leftSeconds) / totalSeconds) * 100;
}

export const mmss = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
