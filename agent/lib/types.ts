export type Interest = 'racing' | 'theater' | 'bike' | 'beach';

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
  beach?: { spot: string; bestMonths: number[] };
  /** Photo search terms for the trip reel: a few sights for the place gallery, one per interest. */
  photos?: { place: string[] } & Partial<Record<Interest, string>>;
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
  /** A made-up listing (see sources/shows.ts), not a real ticket. */
  mock?: boolean;
}

export interface MonthClimate {
  month: number;
  avgHighC: number | null;
  rainyDays: number | null;
  /** 0..1 for long rides. */
  score: number;
  /** 0..1 for beach days. */
  beachScore: number;
}
