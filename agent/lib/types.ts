export type Interest = 'racing' | 'theater' | 'bike';

export interface Person {
  id: string;
  name: string;
  interest: Interest;
  color: string;
  emoji: string;
  /** How many travelers this entry stands for (CJ & wife count as two). */
  travelers: number;
}

export interface RaceEvent {
  series: string;
  name: string;
  /** Jolpica/Ergast circuit id. Only F1 races have one; it unlocks live dates. */
  circuitId?: string;
  typicalMonth: number;
}

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  interests: Interest[];
  racing?: RaceEvent[];
  theater?: { scene: string; bestMonths: number[] };
  bike?: { route: string; bestMonths: number[] };
  notes: string;
}

export interface Race {
  season: number;
  round: number;
  raceName: string;
  circuitId?: string;
  circuitName?: string;
  date: string;
  url?: string;
}

export interface Show {
  name: string;
  date: string;
  venue?: string;
  url?: string;
}

export interface MonthClimate {
  month: number;
  avgHighC: number | null;
  rainyDays: number | null;
  score: number;
}
