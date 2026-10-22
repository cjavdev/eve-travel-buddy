import { nextOccurrence } from '../planner';
import type { Place, Show } from '../types';

// Mocked Ticketmaster-style listings, so the demo needs no API key. Each run lands
// on its next upcoming month, keeping dates in the future. Swap for the Ticketmaster
// Discovery API (parseEvents below already reads its shape) when you want real data.
const MOCK_SHOWS: Record<string, { name: string; venue: string; month: number; day: number }[]> = {
  tokyo: [
    { name: 'The Lion King (Shiki Theatre Company)', venue: 'Shiki Theatre HARU', month: 4, day: 10 },
    { name: 'Kabuki: Kanadehon Chūshingura', venue: 'Kabuki-za', month: 5, day: 3 },
    { name: 'Wicked (Shiki Theatre Company)', venue: 'Dentsu Shiki Theatre UMI', month: 10, day: 17 },
  ],
  toronto: [
    { name: 'Hamilton', venue: 'Ed Mirvish Theatre', month: 7, day: 16 },
    { name: 'Come From Away', venue: 'Royal Alexandra Theatre', month: 6, day: 20 },
    { name: "A Midsummer Night's Dream", venue: 'Stratford Festival Theatre', month: 8, day: 8 },
  ],
  netherlands: [
    { name: 'Soldaat van Oranje', venue: 'TheaterHangaar, Katwijk', month: 6, day: 26 },
    { name: 'The Phantom of the Opera', venue: 'Koninklijk Theater Carré, Amsterdam', month: 10, day: 9 },
    { name: 'Les Misérables', venue: 'DeLaMar Theater, Amsterdam', month: 12, day: 4 },
  ],
};

export function parseEvents(json: any): Show[] {
  return (json?._embedded?.events ?? []).map((e: any) => ({
    name: e.name,
    date: e.dates?.start?.localDate,
    venue: e._embedded?.venues?.[0]?.name,
    url: e.url,
  }));
}

export async function fetchShows(place: Place, today = new Date()): Promise<Show[]> {
  return (MOCK_SHOWS[place.id] ?? [])
    .map(({ name, venue, month, day }) => {
      const { year } = nextOccurrence(month, today);
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { name, venue, date, mock: true };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
