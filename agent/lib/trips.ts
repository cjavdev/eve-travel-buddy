import { BUCKET_LIST } from './data/bucketList';
import { HOME, peopleFor } from './data/party';
import { bestWindow, monthName } from './planner';
import { fetchF1Calendar } from './sources/f1';
import { mockTrip } from './sources/mockTravel';
import { fetchShows, hasTicketmasterKey } from './sources/shows';
import { fetchRideClimate } from './sources/weather';
import type { Place } from './types';

export type SourceStatus = 'live' | 'fallback' | 'off';

async function settle<T>(promise: Promise<T>): Promise<{ value: T | null; ok: boolean }> {
  try {
    return { value: await promise, ok: true };
  } catch {
    return { value: null, ok: false };
  }
}

// Gathers every free data source for the given places and plans each one.
// Shared by the map's API route and the agent's tools so both give the same answer.
export async function planTrips(places: Place[] = BUCKET_LIST, today = new Date()) {
  const races = await fetchF1Calendar(today);
  const plans = await Promise.all(
    places.map(async (place) => {
      const climate = place.interests.includes('bike') ? await settle(fetchRideClimate(place, today)) : null;
      const shows = place.interests.includes('theater') ? await settle(fetchShows(place)) : null;
      const window = bestWindow(place, { today, races, shows: shows?.value ?? null, climate: climate?.value ?? null });
      const people = peopleFor(place.interests);
      const travelers = people.reduce((n, p) => n + p.travelers, 0);
      const trip = mockTrip(HOME, place, { travelers, nights: 3, isEventWeekend: window?.anchored });
      return { place, people, window, trip, travelers, climateOk: climate?.ok, showsOk: shows?.ok };
    }),
  );
  const sources = {
    racing: (races.length ? 'live' : 'fallback') as SourceStatus,
    weather: (plans.some((p) => p.climateOk) ? 'live' : 'fallback') as SourceStatus,
    shows: (hasTicketmasterKey() ? (plans.some((p) => p.showsOk) ? 'live' : 'fallback') : 'off') as SourceStatus,
  };
  return { home: HOME, sources, plans: plans.map(({ climateOk, showsOk, ...rest }) => rest) };
}

export type TripPlans = Awaited<ReturnType<typeof planTrips>>;
export type TripPlan = TripPlans['plans'][number];

export function describePlan({ place, window, trip, travelers }: TripPlan) {
  if (!window) return `${place.name}: no upcoming window found.`;
  const dates = window.start ? `${window.start} to ${window.end}` : `sometime in ${monthName(window.month)} ${window.year}`;
  const who = window.who.map((w) => `${w.person.name} (${w.reason})`).join('; ');
  return `${place.name}: ${window.title}, ${dates}. Fits ${who}. Mock cost for ${travelers}: about $${trip.total.toLocaleString()}.`;
}
