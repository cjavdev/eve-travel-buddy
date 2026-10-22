import { peopleFor } from './data/party.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthName = (m) => MONTHS[m - 1];

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const ym = (dateStr) => ({ year: Number(dateStr.slice(0, 4)), month: Number(dateStr.slice(5, 7)) });

// Next year/month for a calendar month, skipping the current month (too late to plan).
export function nextOccurrence(month, today) {
  const year = today.getFullYear();
  return month > today.getMonth() + 1 ? { year, month } : { year: year + 1, month };
}

function monthsAway({ year, month }, today) {
  return (year - today.getFullYear()) * 12 + (month - (today.getMonth() + 1));
}

// Candidate windows each interest proposes on its own.
function candidates(place, { today, races, shows, climate }) {
  const todayStr = iso(today);
  const out = [];

  if (place.interests.includes('f1')) {
    // Non-F1 races (no circuitId) aren't in the Jolpica calendar, so they always use the typical month.
    const race = place.f1.circuitId && races.find((r) => r.circuitId === place.f1.circuitId && r.date >= todayStr);
    if (race) {
      out.push({
        ...ym(race.date), kind: 'f1', anchored: true,
        start: addDays(race.date, -2), end: race.date,
        title: race.raceName, detail: `Race day ${race.date}`, url: race.url, live: true,
      });
    } else {
      out.push({
        ...nextOccurrence(place.f1.typicalMonth, today), kind: 'f1', anchored: true,
        title: place.f1.raceName, detail: `Usually in ${monthName(place.f1.typicalMonth)}${place.f1.circuitId ? '; date not published yet' : ''}`,
        live: false,
      });
    }
  }

  if (place.interests.includes('theater')) {
    if (shows?.length) {
      const show = shows.find((s) => s.date >= todayStr) ?? shows[0];
      out.push({
        ...ym(show.date), kind: 'theater', anchored: true, start: show.date, end: show.date,
        title: show.name, detail: `${show.date}${show.venue ? ` at ${show.venue}` : ''}`, url: show.url, live: true,
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

  if (place.interests.includes('bike')) {
    const months = climate
      ? climate.filter((c) => c.score >= 0.6).sort((a, b) => b.score - a.score).slice(0, 4).map((c) => c.month)
      : place.bike.bestMonths;
    for (const m of months) {
      out.push({
        ...nextOccurrence(m, today), kind: 'bike', anchored: false,
        title: place.bike.route, detail: bikeDetail(m, place, climate), live: Boolean(climate),
      });
    }
  }
  return out;
}

function bikeDetail(month, place, climate) {
  const c = climate?.find((x) => x.month === month);
  if (!c || c.avgHighC == null) return `${monthName(month)} is a good riding month`;
  return `${monthName(month)}: highs around ${Math.round(c.avgHighC)}°C, about ${c.rainyDays} wet days`;
}

// How well a given month serves one interest, 0..1, with a human reason.
function fit(interest, when, place, ctx, picked) {
  if (picked.kind === interest) return { strength: 1, reason: picked.detail, title: picked.title };
  const same = (c) => c.kind === interest && c.year === when.year && c.month === when.month;
  const match = ctx.all.find(same);
  if (match) return { strength: 1, reason: match.detail, title: match.title };
  if (interest === 'theater') {
    // Big theater scenes run year-round, just not at their best.
    return { strength: 0.4, reason: `${place.theater.scene} runs year-round`, title: place.theater.scene };
  }
  if (interest === 'bike' && ctx.climate) {
    const c = ctx.climate.find((x) => x.month === when.month);
    if (c && c.score >= 0.4) return { strength: c.score, reason: bikeDetail(when.month, place, ctx.climate), title: place.bike.route };
  }
  return { strength: 0, reason: null };
}

// Best upcoming window for a place: the month that serves the most of the party,
// favoring real dated events and sooner trips.
export function bestWindow(place, { today = new Date(), races = [], shows = null, climate = null } = {}) {
  const all = candidates(place, { today, races, shows, climate });
  const ctx = { all, climate };
  const scored = all.map((c) => {
    const fits = place.interests.map((interest) => ({ interest, ...fit(interest, c, place, ctx, c) }));
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
