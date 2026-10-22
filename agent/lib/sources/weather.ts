import type { MonthClimate, Place } from '../types';
import { cached, getJson } from './cache';

// Open-Meteo historical archive: free and keyless. We use last full year's daily
// weather as a stand-in for climate when scoring months for long rides.
const BASE = 'https://archive-api.open-meteo.com/v1/archive';

interface Daily {
  time: string[];
  temperature_2m_max: (number | null)[];
  precipitation_sum: (number | null)[];
}

export function monthlyStats(daily: Daily) {
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, highs: [] as number[], rainyDays: 0, days: 0 }));
  daily.time.forEach((day, i) => {
    const m = months[Number(day.slice(5, 7)) - 1];
    m.days += 1;
    const high = daily.temperature_2m_max[i];
    if (high != null) m.highs.push(high);
    if ((daily.precipitation_sum[i] ?? 0) >= 1) m.rainyDays += 1;
  });
  return months.map(({ month, highs, rainyDays, days }) => ({
    month,
    avgHighC: highs.length ? highs.reduce((a, b) => a + b, 0) / highs.length : null,
    rainyDays: days ? Math.round((rainyDays / days) * 30) : null,
  }));
}

// 0..1, peaking around a 22°C high with few wet days.
export function rideScore({ avgHighC, rainyDays }: { avgHighC: number | null; rainyDays: number | null }) {
  if (avgHighC == null) return 0;
  const temp = Math.max(0, 1 - Math.abs(avgHighC - 22) / 12);
  const dry = Math.max(0, 1 - (rainyDays ?? 0) / 15);
  return temp * 0.6 + dry * 0.4;
}

export async function fetchRideClimate(place: Place, today = new Date()): Promise<MonthClimate[]> {
  const year = today.getFullYear() - 1;
  return cached(`wx:${place.id}:${year}`, async () => {
    const params = new URLSearchParams({
      latitude: String(place.lat),
      longitude: String(place.lng),
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
      daily: 'temperature_2m_max,precipitation_sum',
      timezone: 'auto',
    });
    const json = await getJson(`${BASE}?${params}`);
    return monthlyStats(json.daily).map((m) => ({ ...m, score: rideScore(m) }));
  });
}
