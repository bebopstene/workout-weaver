/**
 * Defaticamento in coda a ogni allenamento.
 *
 * Gli allungamenti sono mirati ai muscoli della giornata: pettorali e spalle
 * dopo la spinta, femorali e flessori dell'anca dopo le gambe. Sono valori di
 * partenza sensati, non prescrizioni: si modificano dall'app, e le modifiche
 * restano nel dispositivo insieme al resto.
 */

export type Stretch = {
  id: string;
  name: string;
  /** Secondi di tenuta. Per gli allungamenti per lato, è il tempo di ciascun lato. */
  seconds: number;
  target: string;
  /** Da ripetere su entrambi i lati. */
  perSide?: boolean;
};

export const DEFAULT_STRETCHES: Record<string, Stretch[]> = {
  petto: [
    {
      id: "pettorali-muro",
      name: "Apertura pettorali al muro",
      seconds: 30,
      target: "Pettorali",
      perSide: true,
    },
    {
      id: "deltoide-incrociato",
      name: "Deltoide posteriore incrociato",
      seconds: 30,
      target: "Spalle",
      perSide: true,
    },
    {
      id: "tricipite-testa",
      name: "Tricipite sopra la testa",
      seconds: 30,
      target: "Tricipiti",
      perSide: true,
    },
    { id: "bambino", name: "Posizione del bambino", seconds: 45, target: "Dorsali e schiena" },
  ],
  gambe: [
    {
      id: "femorali-seduto",
      name: "Femorali da seduto",
      seconds: 40,
      target: "Femorali",
      perSide: true,
    },
    {
      id: "quadricipite-piedi",
      name: "Quadricipite in piedi",
      seconds: 30,
      target: "Quadricipiti",
      perSide: true,
    },
    {
      id: "flessori-affondo",
      name: "Affondo per flessori dell'anca",
      seconds: 40,
      target: "Flessori dell'anca",
      perSide: true,
    },
    {
      id: "piccione",
      name: "Posizione del piccione",
      seconds: 40,
      target: "Glutei",
      perSide: true,
    },
    {
      id: "polpacci-muro",
      name: "Polpacci al muro",
      seconds: 30,
      target: "Polpacci",
      perSide: true,
    },
  ],
  schiena: [
    { id: "sospensione-sbarra", name: "Sospensione alla sbarra", seconds: 30, target: "Dorsali" },
    { id: "gatto-cammello", name: "Gatto-cammello", seconds: 40, target: "Colonna" },
    {
      id: "bicipiti-muro",
      name: "Bicipiti al muro",
      seconds: 30,
      target: "Bicipiti",
      perSide: true,
    },
    {
      id: "torsione-supino",
      name: "Torsione da supino",
      seconds: 40,
      target: "Schiena bassa",
      perSide: true,
    },
  ],
};

export const defaultStretches = (): Record<string, Stretch[]> =>
  Object.fromEntries(
    Object.entries(DEFAULT_STRETCHES).map(([day, list]) => [day, list.map((s) => ({ ...s }))]),
  );

/** Durata totale del defaticamento, contando due volte gli allungamenti per lato. */
export const totalStretchSeconds = (list: Stretch[]) =>
  list.reduce((t, s) => t + s.seconds * (s.perSide ? 2 : 1), 0);
