import { cached, getJson } from './cache.js';

// Ticketmaster Discovery API, free tier. Needs VITE_TICKETMASTER_KEY; without it we
// return null and the planner falls back to the seeded best months.
const BASE = 'https://app.ticketmaster.com/discovery/v2/events.json';
const KEY = import.meta.env?.VITE_TICKETMASTER_KEY;

export const hasTicketmasterKey = Boolean(KEY);

export function parseEvents(json) {
  return (json?._embedded?.events ?? []).map((e) => ({
    name: e.name,
    date: e.dates?.start?.localDate,
    venue: e._embedded?.venues?.[0]?.name,
    url: e.url,
  }));
}

export async function fetchShows(place) {
  if (!KEY) return null;
  return cached(`tm:${place.id}`, async () => {
    const params = new URLSearchParams({
      apikey: KEY,
      latlong: `${place.lat},${place.lng}`,
      radius: '30',
      unit: 'miles',
      classificationName: 'Theatre',
      sort: 'date,asc',
      size: '10',
    });
    return parseEvents(await getJson(`${BASE}?${params}`));
  });
}
