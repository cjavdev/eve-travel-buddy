import { HOME } from './data/party';
import { monthName } from './planner';
import { type Photo, searchPhotos } from './sources/photos';
import type { TripPlan } from './trips';

// Everything the trip reel video needs, as plain JSON: the tool returns it and the chat
// plays it with Remotion's <Player>, so no video file is rendered or stored.
export interface TripReel {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  home: { name: string; code: string; lat: number; lng: number };
  /** The anchor event, e.g. "F1: Japanese Grand Prix". */
  headline: string;
  /** "Apr 2–6, 2027" for a dated window, or "April 2027" for a typical month. */
  when: string;
  confirmedDate: boolean;
  travelers: number;
  mockCost: number;
  /** Photos of the place itself; the first is the cover. */
  gallery: Photo[];
  beats: { name: string; emoji: string; color: string; title: string; reason: string; photos: Photo[] }[];
}

const GALLERY_PHOTOS = 6;
const BEAT_PHOTOS = 3;

const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatWhen(window: { year: number; month: number; start?: string; end?: string }) {
  if (!window.start || !window.end) return `${MONTH_LONG[window.month - 1]} ${window.year}`;
  const [, sm, sd] = window.start.split('-').map(Number);
  const [ey, em, ed] = window.end.split('-').map(Number);
  const startText = `${monthName(sm)} ${sd}`;
  const endText = em === sm ? `${ed}` : `${monthName(em)} ${ed}`;
  return `${startText}–${endText}, ${ey}`;
}

// Searches run in parallel; afterwards each photo is kept only the first time it shows up,
// so the place gallery and the per-person beats never repeat a shot.
async function photosFor(query: string | undefined, limit: number): Promise<Photo[]> {
  if (!query) return [];
  // No photos is fine: the reel falls back to colored cards.
  return searchPhotos(query, limit + 2).catch(() => []);
}

export async function buildReel(plan: TripPlan): Promise<TripReel | null> {
  const { place, window, trip, travelers } = plan;
  if (!window) return null;
  const sights = place.photos?.place ?? [place.name];
  const perSight = Math.ceil(GALLERY_PHOTOS / sights.length);
  const [beatPhotos, sightPhotos] = await Promise.all([
    Promise.all(window.who.map((w) => photosFor(place.photos?.[w.person.interest], BEAT_PHOTOS))),
    Promise.all(sights.map((q) => photosFor(q, perSight))),
  ]);
  const used = new Set<string>();
  const take = (photos: Photo[], n: number) => {
    const fresh = photos.filter((p) => !used.has(p.url)).slice(0, n);
    fresh.forEach((p) => used.add(p.url));
    return fresh;
  };
  // A couple of shots from each sight, interleaved so the gallery doesn't show one sight twice in a row.
  const gallery = take(
    Array.from({ length: perSight + 2 }, (_, i) => sightPhotos.map((photos) => photos[i])).flat().filter((p) => p !== undefined),
    GALLERY_PHOTOS,
  );
  return {
    placeId: place.id,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    home: HOME,
    headline: window.title,
    when: formatWhen(window),
    confirmedDate: window.live,
    travelers,
    mockCost: trip.total,
    gallery,
    // One beat per person, in party order, each with photos of the thing they'll love.
    beats: window.who.map((w, i) => ({
      name: w.person.name,
      emoji: w.person.emoji,
      color: w.person.color,
      title: w.title ?? place.name,
      reason: w.reason ?? '',
      photos: take(beatPhotos[i], BEAT_PHOTOS),
    })),
  };
}
