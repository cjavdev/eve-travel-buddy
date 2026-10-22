import type { Place, Show } from '../types';
import { cached, getJson } from './cache';

// Ticketmaster Discovery API, free tier. Needs TICKETMASTER_KEY on the server; without
// it we return null and the planner falls back to the seeded best months.
const BASE = 'https://app.ticketmaster.com/discovery/v2/events.json';

export const hasTicketmasterKey = () => Boolean(process.env.TICKETMASTER_KEY);

export function parseEvents(json: any): Show[] {
  return (json?._embedded?.events ?? []).map((e: any) => ({
    name: e.name,
    date: e.dates?.start?.localDate,
    venue: e._embedded?.venues?.[0]?.name,
    url: e.url,
  }));
}

export async function fetchShows(place: Place): Promise<Show[] | null> {
  const key = process.env.TICKETMASTER_KEY;
  if (!key) return null;
  return cached(`tm:${place.id}`, async () => {
    const params = new URLSearchParams({
      apikey: key,
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
