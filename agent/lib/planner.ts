import { peopleFor } from './data/party';
import type { Interest, MonthClimate, Person, Place, Race, Show } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthName = (m: number) => MONTHS[m - 1];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (dateStr: string, n: number) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const ym = (dateStr: string) => ({ year: Number(dateStr.slice(0, 4)), month: Number(dateStr.slice(5, 7)) });

interface YearMonth {
  year: number;
  month: number;
}

interface Candidate extends YearMonth {
  kind: Interest;
  anchored: boolean;
  start?: string;
  end?: string;
  title: string;
  detail: string;
  url?: string;
  live: boolean;
  mock?: boolean;
}

interface Fit {
  interest: Interest;
  strength: number;
  reason: string | null;
  title?: string;
}

export interface TripWindow extends Candidate {
  fits: Fit[];
  score: number;
  label: string;
  who: { person: Person; reason: string | null; title?: string; strong: boolean }[];
}

export interface PlanInputs {
  today?: Date;
  races?: Race[];
  shows?: Show[] | null;
  climate?: MonthClimate[] | null;
}

// Next year/month for a calendar month, skipping the current month (too late to plan).
export function nextOccurrence(month: number, today: Date): YearMonth {
  const year = today.getFullYear();
  return month > today.getMonth() + 1 ? { year, month } : { year: year + 1, month };
}

function monthsAway({ year, month }: YearMonth, today: Date) {
  return (year - today.getFullYear()) * 12 + (month - (today.getMonth() + 1));
}

// Weather-driven interests: which score to read, what to call the activity, and where.
const WEATHER = {
  bike: { score: (c: MonthClimate) => c.score, activity: 'riding', where: (p: Place) => p.bike },
  beach: { score: (c: MonthClimate) => c.beachScore, activity: 'beach', where: (p: Place) => p.beach },
} as const;
type WeatherInterest = keyof typeof WEATHER;

function weatherDetail(kind: WeatherInterest, month: number, climate: MonthClimate[] | null) {
  const c = climate?.find((x) => x.month === month);
  if (!c || c.avgHighC == null) return `${monthName(month)} is a good ${WEATHER[kind].activity} month`;
  return `${monthName(month)}: highs around ${Math.round(c.avgHighC)}°C, about ${c.rainyDays} wet days`;
}

function weatherTitle(kind: WeatherInterest, place: Place) {
  const spot = WEATHER[kind].where(place);
  return spot && 'route' in spot ? spot.route : (spot?.spot ?? '');
}

// Candidate windows each interest proposes on its own.
function candidates(place: Place, today: Date, races: Race[], shows: Show[] | null, climate: MonthClimate[] | null) {
  const todayStr = iso(today);
  const out: Candidate[] = [];

  if (place.interests.includes('racing')) {
    for (const event of place.racing ?? []) {
      // Only F1 races have a circuitId in the Jolpica calendar; the rest use their typical month.
      const race = event.circuitId && races.find((r) => r.circuitId === event.circuitId && r.date >= todayStr);
      if (race) {
        out.push({
          ...ym(race.date), kind: 'racing', anchored: true,
          start: addDays(race.date, -2), end: race.date,
          title: `${event.series}: ${race.raceName}`, detail: `${event.series} race day ${race.date}`, url: race.url, live: true,
        });
      } else {
        out.push({
          ...nextOccurrence(event.typicalMonth, today), kind: 'racing', anchored: true,
          title: `${event.series}: ${event.name}`,
          detail: `${event.series}, usually in ${monthName(event.typicalMonth)}${event.circuitId ? '; date not published yet' : ''}`,
          live: false,
        });
      }
    }
  }

  if (place.interests.includes('theater') && place.theater) {
    if (shows?.length) {
      const show = shows.find((s) => s.date >= todayStr) ?? shows[0];
      out.push({
        ...ym(show.date), kind: 'theater', anchored: true, start: show.date, end: show.date,
        title: show.name, detail: `${show.date}${show.venue ? ` at ${show.venue}` : ''}`, url: show.url,
        live: !show.mock, mock: show.mock,
      });
    } else {
      for (const m of place.theater.bestMonths) {
        out.push({
          ...nextOccurrence(m, today), kind: 'theater', anchored: false,
          title: place.theater.scene, detail: `${monthName(m)} is a strong month for ${place.theater.scene}`, live: false,
        });
      }
    }
  }

  for (const kind of Object.keys(WEATHER) as WeatherInterest[]) {
    const spot = WEATHER[kind].where(place);
    if (!place.interests.includes(kind) || !spot) continue;
    const score = WEATHER[kind].score;
    const months = climate
      ? climate.filter((c) => score(c) >= 0.6).sort((a, b) => score(b) - score(a)).slice(0, 4).map((c) => c.month)
      : spot.bestMonths;
    for (const m of months) {
      out.push({
        ...nextOccurrence(m, today), kind, anchored: false,
        title: weatherTitle(kind, place), detail: weatherDetail(kind, m, climate), live: Boolean(climate),
      });
    }
  }
  return out;
}

// How well a given month serves one interest, 0..1, with a human reason.
function fit(interest: Interest, when: Candidate, place: Place, all: Candidate[], climate: MonthClimate[] | null): Omit<Fit, 'interest'> {
  if (when.kind === interest) return { strength: 1, reason: when.detail, title: when.title };
  const match = all.find((c) => c.kind === interest && c.year === when.year && c.month === when.month);
  if (match) return { strength: 1, reason: match.detail, title: match.title };
  if (interest === 'theater' && place.theater) {
    // Big theater scenes run year-round, just not at their best.
    return { strength: 0.4, reason: `${place.theater.scene} runs year-round`, title: place.theater.scene };
  }
  if ((interest === 'bike' || interest === 'beach') && climate && WEATHER[interest].where(place)) {
    const c = climate.find((x) => x.month === when.month);
    const strength = c ? WEATHER[interest].score(c) : 0;
    if (strength >= 0.4) return { strength, reason: weatherDetail(interest, when.month, climate), title: weatherTitle(interest, place) };
  }
  return { strength: 0, reason: null };
}

// Best upcoming window for a place: the month that serves the most of the party,
// favoring real dated events and sooner trips.
export function bestWindow(place: Place, { today = new Date(), races = [], shows = null, climate = null }: PlanInputs = {}): TripWindow | null {
  const all = candidates(place, today, races, shows, climate);
  const scored = all.map((c) => {
    const fits = place.interests.map((interest) => ({ interest, ...fit(interest, c, place, all, climate) }));
    const score = fits.reduce((s, f) => s + f.strength, 0) + (c.anchored ? 0.5 : 0) - monthsAway(c, today) * 0.04;
    return { ...c, fits, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;
  return {
    ...best,
    label: `${place.name.split(',')[0]}, ${monthName(best.month)} ${best.year}`,
    who: best.fits
      .filter((f) => f.strength > 0)
      .flatMap((f) => peopleFor([f.interest]).map((person) => ({ person, reason: f.reason, title: f.title, strong: f.strength >= 0.6 }))),
  };
}
