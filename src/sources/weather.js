import { cached, getJson } from './cache.js';

// Open-Meteo historical archive: free and keyless. We use last full year's daily
// weather as a stand-in for climate when scoring months for long rides.
const BASE = 'https://archive-api.open-meteo.com/v1/archive';

export function monthlyStats(daily) {
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, highs: [], rainyDays: 0, days: 0 }));
  daily.time.forEach((day, i) => {
    const m = months[Number(day.slice(5, 7)) - 1];
    m.days += 1;
    if (daily.temperature_2m_max[i] != null) m.highs.push(daily.temperature_2m_max[i]);
    if ((daily.precipitation_sum[i] ?? 0) >= 1) m.rainyDays += 1;
  });
  return months.map(({ month, highs, rainyDays, days }) => ({
    month,
    avgHighC: highs.length ? highs.reduce((a, b) => a + b, 0) / highs.length : null,
    rainyDays: days ? Math.round((rainyDays / days) * 30) : null,
  }));
}

// 0..1, peaking around a 22°C high with few wet days.
export function rideScore({ avgHighC, rainyDays }) {
  if (avgHighC == null) return 0;
  const temp = Math.max(0, 1 - Math.abs(avgHighC - 22) / 12);
  const dry = Math.max(0, 1 - rainyDays / 15);
  return temp * 0.6 + dry * 0.4;
}

export async function fetchRideClimate(place, today = new Date()) {
  const year = today.getFullYear() - 1;
  return cached(`wx:${place.id}:${year}`, async () => {
    const params = new URLSearchParams({
      latitude: place.lat,
      longitude: place.lng,
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
      daily: 'temperature_2m_max,precipitation_sum',
      timezone: 'auto',
    });
    const json = await getJson(`${BASE}?${params}`);
    return monthlyStats(json.daily).map((m) => ({ ...m, score: rideScore(m) }));
  });
}
