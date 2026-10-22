import type { Race } from '../types';
import { cached, getJson } from './cache';

// Jolpica is the free, keyless successor to the Ergast F1 API.
const BASE = 'https://api.jolpi.ca/ergast/f1';

export function parseRaces(json: any): Race[] {
  return (json?.MRData?.RaceTable?.Races ?? []).map((r: any) => ({
    season: Number(r.season),
    round: Number(r.round),
    raceName: r.raceName,
    circuitId: r.Circuit?.circuitId,
    circuitName: r.Circuit?.circuitName,
    date: r.date,
    url: r.url,
  }));
}

// Races for this season and next. Next season's calendar may not be published yet,
// so a failure there is not an error.
export async function fetchF1Calendar(today = new Date()): Promise<Race[]> {
  const year = today.getFullYear();
  const seasons = await Promise.all(
    [year, year + 1].map((y) =>
      cached(`f1:${y}`, async () => parseRaces(await getJson(`${BASE}/${y}.json`))).catch(() => [] as Race[]),
    ),
  );
  return seasons.flat();
}
