import { describe, expect, it } from 'vitest';
import { bestWindow, nextOccurrence } from '../agent/lib/planner';
import { BUCKET_LIST } from '../agent/lib/data/bucketList';
import { parseRaces } from '../agent/lib/sources/f1';
import { beachScore, monthlyStats, rideScore } from '../agent/lib/sources/weather';
import { fetchShows } from '../agent/lib/sources/shows';
import { parseEvents } from '../agent/lib/sources/shows';
import type { Place, Race } from '../agent/lib/types';

const race = (r: Omit<Race, 'season' | 'round'>): Race => ({ season: Number(r.date.slice(0, 4)), round: 1, ...r });

const today = new Date('2026-10-22T12:00:00Z');
const place = (id: string) => BUCKET_LIST.find((p) => p.id === id)!;
const bikeOnly: Place = { id: 'girona', name: 'Girona', lat: 41.98, lng: 2.82, interests: ['bike'], bike: { route: 'Rocacorba', bestMonths: [4] }, notes: '' };
const theaterOnly: Place = { id: 'nyc', name: 'New York City', lat: 40.76, lng: -73.98, interests: ['theater'], theater: { scene: 'Broadway', bestMonths: [6] }, notes: '' };

describe('nextOccurrence', () => {
  it('rolls to next year for this or earlier months', () => {
    expect(nextOccurrence(11, today)).toEqual({ year: 2026, month: 11 });
    expect(nextOccurrence(10, today)).toEqual({ year: 2027, month: 10 });
    expect(nextOccurrence(3, today)).toEqual({ year: 2027, month: 3 });
  });
});

describe('bestWindow', () => {
  it('uses a live race weekend when the calendar has one', () => {
    const races = [race({ circuitId: 'suzuka', raceName: 'Japanese Grand Prix', date: '2027-04-04', url: 'x' })];
    const w = bestWindow(place('tokyo'), { today, races });
    expect(w).toMatchObject({ kind: 'racing', title: 'F1: Japanese Grand Prix', year: 2027, month: 4, start: '2027-04-02', end: '2027-04-04', live: true });
    // April is also a seeded theater and riding month, so everyone fits.
    expect(w!.who.map((f) => f.person.id)).toEqual(expect.arrayContaining(['greyson', 'logan', 'parents']));
  });

  it('ignores races that already happened and falls back to the typical month', () => {
    const races = [race({ circuitId: 'suzuka', raceName: 'Japanese Grand Prix', date: '2026-04-05' })];
    const w = bestWindow(place('tokyo'), { today, races });
    expect(w).toMatchObject({ kind: 'racing', title: 'F1: Japanese Grand Prix at Suzuka', year: 2027, month: 4, live: false });
  });

  it('uses the typical month for other series even when the calendar loads', () => {
    const races = [race({ circuitId: 'villeneuve', raceName: 'Canadian Grand Prix', date: '2027-06-13' })];
    const w = bestWindow(place('toronto'), { today, races });
    expect(w).toMatchObject({ kind: 'racing', title: 'IndyCar: Honda Indy Toronto', year: 2027, month: 7, live: false });
    expect(w!.who.map((f) => f.person.id)).toEqual(expect.arrayContaining(['greyson', 'logan', 'parents']));
  });

  it('handles any racing series, not just F1', () => {
    const w = bestWindow(place('netherlands'), { today });
    expect(w).toMatchObject({ kind: 'racing', title: 'MotoGP: Dutch TT at Assen', year: 2027, month: 6 });
  });

  it('picks a riding month from climate data for bike-only places', () => {
    const climate = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, avgHighC: 10, rainyDays: 12, score: 0.2, beachScore: 0 }));
    climate[4] = { month: 5, avgHighC: 23, rainyDays: 3, score: 0.95, beachScore: 0.5 };
    const w = bestWindow(bikeOnly, { today, climate });
    expect(w).toMatchObject({ kind: 'bike', year: 2027, month: 5, live: true });
    expect(w!.who[0].reason).toContain('23°C');
  });

  it('prefers a real show date for theater places', () => {
    const shows = [{ name: 'Hamilton', date: '2026-12-05', venue: 'Richard Rodgers', url: 'u' }];
    const w = bestWindow(theaterOnly, { today, shows });
    expect(w).toMatchObject({ kind: 'theater', title: 'Hamilton', start: '2026-12-05' });
  });

  it('gives every pin a window with no live data at all', () => {
    for (const p of BUCKET_LIST) expect(bestWindow(p, { today })).not.toBeNull();
  });
});

describe('source parsers', () => {
  it('parses Jolpica races', () => {
    const json = { MRData: { RaceTable: { Races: [{ season: '2027', round: '1', raceName: 'Australian Grand Prix', date: '2027-03-14', url: 'u', Circuit: { circuitId: 'albert_park', circuitName: 'Albert Park' } }] } } };
    expect(parseRaces(json)[0]).toMatchObject({ season: 2027, circuitId: 'albert_park', date: '2027-03-14' });
    expect(parseRaces({})).toEqual([]);
  });

  it('builds monthly ride stats from Open-Meteo daily data', () => {
    const stats = monthlyStats({ time: ['2025-05-01', '2025-05-02'], temperature_2m_max: [20, 24], precipitation_sum: [0, 5] });
    expect(stats[4]).toEqual({ month: 5, avgHighC: 22, rainyDays: 15 });
    expect(rideScore({ avgHighC: 22, rainyDays: 0 })).toBe(1);
    expect(beachScore({ avgHighC: 28, rainyDays: 0 })).toBe(1);
  });

  it('parses Ticketmaster events', () => {
    const json = { _embedded: { events: [{ name: 'Wicked', url: 'u', dates: { start: { localDate: '2026-11-02' } }, _embedded: { venues: [{ name: 'Gershwin' }] } }] } };
    expect(parseEvents(json)).toEqual([{ name: 'Wicked', date: '2026-11-02', venue: 'Gershwin', url: 'u' }]);
  });

  it('serves mock show listings dated in the future', async () => {
    const shows = await fetchShows(place('toronto'), today);
    expect(shows.length).toBeGreaterThan(0);
    for (const show of shows) {
      expect(show.mock).toBe(true);
      expect(show.date > '2026-10-22').toBe(true);
    }
  });
});
