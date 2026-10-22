import { z } from 'zod';
import { PARTY } from './data/party';
import { formatWhen } from './reel';
import { type Photo, searchPhotos } from './sources/photos';
import type { TripPlan } from './trips';

// Day-by-day planning: we lay out the days and their themes here, a day_researcher subagent
// fills in each day in parallel, and the chat shows the result as interactive slides.

export const dayResearchSchema = z.object({
  summary: z.string().describe('One sentence on the shape of the day.'),
  stops: z
    .array(
      z.object({
        time: z.string().describe('Local start time, like "9:30 AM".'),
        name: z.string().describe('The real place or venue.'),
        lat: z.number(),
        lng: z.number(),
        who: z.array(z.string()).describe('Party ids this stop is for. All ids when everyone goes.'),
        what: z.string().describe('One or two concrete sentences on what you do there.'),
        photoQuery: z.string().describe('A Wikimedia Commons search term for a photo of this place.'),
      }),
    )
    .min(1)
    .max(6),
});
export type DayResearch = z.infer<typeof dayResearchSchema>;

export interface DayBrief {
  day: number;
  date: string;
  theme: string;
  /** Party ids whose interest this day is built around. Empty for a shared day. */
  focus: string[];
}

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Lays out the trip: arrive on day 1, the anchor event (race day or show night) on day 3
 * (or the last day of a shorter trip), one day built around each other person, and
 * shared city days to fill the rest.
 */
export function layoutDays(plan: TripPlan, dayCount: number): DayBrief[] {
  const { window, place } = plan;
  if (!window) return [];
  const anchorDay = Math.min(3, dayCount);
  const start = window.end
    ? addDays(window.end, -(anchorDay - 1))
    : `${window.year}-${String(window.month).padStart(2, '0')}-10`;
  const city = place.name.split(',')[0];
  const anchorPeople = window.who.filter((w) => w.title === window.title).map((w) => w.person.id);
  const others = window.who.filter((w) => !anchorPeople.includes(w.person.id));
  const queue = [...others];
  return Array.from({ length: dayCount }, (_, i) => {
    const day = i + 1;
    const date = addDays(start, i);
    if (day === anchorDay) return { day, date, theme: window.title, focus: anchorPeople };
    if (day === 1) return { day, date, theme: `Arrive and settle into ${city}`, focus: [] };
    const next = queue.shift();
    if (next) return { day, date, theme: next.title ?? `${city} for ${next.person.name}`, focus: [next.person.id] };
    return { day, date, theme: day === dayCount ? `Last day in ${city}` : `The best of ${city}`, focus: [] };
  });
}

export function briefFor(plan: TripPlan, days: DayBrief[], brief: DayBrief) {
  const { place, window } = plan;
  const people = window?.who.map((w) => w.person) ?? [];
  const party = (people.length ? people : PARTY).map((p) => `- ${p.id}: ${p.name}, loves ${p.interest}`).join('\n');
  const otherDays = days.filter((d) => d.day !== brief.day).map((d) => `- Day ${d.day} (${d.date}): ${d.theme}`).join('\n');
  return [
    `Destination: ${place.name} (${place.lat}, ${place.lng}). ${place.notes}`,
    `Day ${brief.day} of ${days.length}, ${brief.date}${window?.live ? '' : ' (the exact dates are not confirmed yet)'}.`,
    `Theme: ${brief.theme}.`,
    brief.focus.length ? `Built around: ${brief.focus.join(', ')}. Everyone else still needs something to enjoy.` : 'A shared day for the whole group.',
    `Who's on the trip (party ids):\n${party}`,
    `The other days already cover:\n${otherDays}`,
    brief.day === 1 ? 'They land today, so keep it light and close to central lodging.' : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export interface TripDeck {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  headline: string;
  when: string;
  confirmedDate: boolean;
  travelers: number;
  mockCost: number;
  party: { id: string; name: string; emoji: string; color: string }[];
  cover: Photo | null;
  days: (DayBrief & {
    summary: string;
    stops: (DayResearch['stops'][number] & { photo: Photo | null })[];
    /** Set when the researcher for this day failed; the slide says so. */
    error?: string;
  })[];
}

/** Turns the researched days into the deck the chat renders, with a photo for every stop. */
export async function buildDeck(plan: TripPlan, briefs: DayBrief[], research: (DayResearch | { error: string })[]): Promise<TripDeck> {
  const { place, window, trip, travelers } = plan;
  const used = new Set<string>();
  const search = (query: string) => searchPhotos(query, 3).catch(() => [] as Photo[]);
  // Search everything in parallel, then pick in order so no two slides share a photo.
  const [coverPhotos, ...stopPhotos] = await Promise.all([
    search(place.photos?.place[0] ?? place.name),
    ...research.flatMap((r) => ('stops' in r ? r.stops.map((s) => search(s.photoQuery)) : [])),
  ]);
  const pick = (photos: Photo[]) => {
    const photo = photos.find((p) => !used.has(p.url)) ?? null;
    if (photo) used.add(photo.url);
    return photo;
  };
  const cover = pick(coverPhotos);
  let n = 0;
  const people = window?.who.map((w) => w.person) ?? [];
  return {
    placeId: place.id,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    headline: window?.title ?? place.name,
    when: window ? formatWhen(window) : '',
    confirmedDate: window?.live ?? false,
    travelers,
    mockCost: trip.total,
    party: people.map(({ id, name, emoji, color }) => ({ id, name, emoji, color })),
    cover,
    days: briefs.map((brief, i) => {
      const r = research[i];
      if (!r || !('stops' in r)) return { ...brief, summary: '', stops: [], error: r?.error ?? 'No research came back.' };
      return { ...brief, summary: r.summary, stops: r.stops.map((s) => ({ ...s, photo: pick(stopPhotos[n++]) })) };
    }),
  };
}
