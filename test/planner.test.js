import { describe, expect, it } from 'vitest';
import { bestWindow, nextOccurrence } from '../src/planner.js';
import { BUCKET_LIST } from '../src/data/bucketList.js';
import { parseRaces } from '../src/sources/f1.js';
import { monthlyStats, rideScore } from '../src/sources/weather.js';
import { parseEvents } from '../src/sources/shows.js';

const today = new Date('2026-10-22T12:00:00Z');
const place = (id) => BUCKET_LIST.find((p) => p.id === id);
const bikeOnly = { id: 'girona', name: 'Girona', lat: 41.98, lng: 2.82, interests: ['bike'], bike: { route: 'Rocacorba', bestMonths: [4] } };
const theaterOnly = { id: 'nyc', name: 'New York City', lat: 40.76, lng: -73.98, interests: ['theater'], theater: { scene: 'Broadway', bestMonths: [6] } };

describe('nextOccurrence', () => {
  it('rolls to next year for this or earlier months', () => {
    expect(nextOccurrence(11, today)).toEqual({ year: 2026, month: 11 });
    expect(nextOccurrence(10, today)).toEqual({ year: 2027, month: 10 });
    expect(nextOccurrence(3, today)).toEqual({ year: 2027, month: 3 });
  });
});

describe('bestWindow', () => {
  it('uses a live race weekend when the calendar has one', () => {
    const races = [{ circuitId: 'zandvoort', raceName: 'Dutch Grand Prix', date: '2027-08-29', url: 'x' }];
    const w = bestWindow(place('netherlands'), { today, races });
    expect(w).toMatchObject({ kind: 'f1', year: 2027, month: 8, start: '2027-08-27', end: '2027-08-29', live: true });
    // August is also a seeded riding month, so the parents fit too.
    expect(w.who.map((f) => f.person.id).sort()).toEqual(['logan', 'parents']);
  });

  it('ignores races that already happened and falls back to the typical month', () => {
    const races = [{ circuitId: 'suzuka', raceName: 'Japanese Grand Prix', date: '2026-04-05' }];
    const w = bestWindow(place('tokyo'), { today, races });
    expect(w).toMatchObject({ kind: 'f1', year: 2027, month: 4, live: false });
  });

  it('uses the typical month for non-F1 races even when the calendar loads', () => {
    const races = [{ circuitId: 'villeneuve', raceName: 'Canadian Grand Prix', date: '2027-06-13' }];
    const w = bestWindow(place('toronto'), { today, races });
    expect(w).toMatchObject({ kind: 'f1', title: 'Honda Indy Toronto', year: 2027, month: 7, live: false });
    expect(w.who.map((f) => f.person.id).sort()).toEqual(['greyson', 'logan', 'parents']);
  });

  it('picks a riding month from climate data for bike-only places', () => {
    const climate = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, avgHighC: 10, rainyDays: 12, score: 0.2 }));
    climate[4] = { month: 5, avgHighC: 23, rainyDays: 3, score: 0.95 };
    const w = bestWindow(bikeOnly, { today, climate });
    expect(w).toMatchObject({ kind: 'bike', year: 2027, month: 5, live: true });
    expect(w.who[0].reason).toContain('23°C');
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
  });

  it('parses Ticketmaster events', () => {
    const json = { _embedded: { events: [{ name: 'Wicked', url: 'u', dates: { start: { localDate: '2026-11-02' } }, _embedded: { venues: [{ name: 'Gershwin' }] } }] } };
    expect(parseEvents(json)).toEqual([{ name: 'Wicked', date: '2026-11-02', venue: 'Gershwin', url: 'u' }]);
  });
});
