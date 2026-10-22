import { describe, expect, it } from 'vitest';
import { BUCKET_LIST } from '../agent/lib/data/bucketList';
import { PARTY } from '../agent/lib/data/party';
import { briefFor, layoutDays } from '../agent/lib/itinerary';
import type { TripPlan } from '../agent/lib/trips';

const tokyo = BUCKET_LIST.find((p) => p.id === 'tokyo')!;
const person = (id: string) => PARTY.find((p) => p.id === id)!;
const plan = {
  place: tokyo,
  people: PARTY,
  travelers: 6,
  trip: { total: 9000 },
  window: {
    year: 2027, month: 4, start: '2027-04-02', end: '2027-04-04', title: 'F1: Japanese Grand Prix', live: true,
    who: [
      { person: person('logan'), reason: 'race day', title: 'F1: Japanese Grand Prix', strong: true },
      { person: person('greyson'), reason: 'musicals', title: 'Kabuki-za', strong: true },
      { person: person('parents'), reason: 'mild', title: 'Tamagawa cycling road', strong: true },
    ],
  },
} as unknown as TripPlan;

describe('layoutDays', () => {
  it('puts the anchor on day 3 and gives each other person a day', () => {
    const days = layoutDays(plan, 5);
    expect(days.map((d) => d.date)).toEqual(['2027-04-02', '2027-04-03', '2027-04-04', '2027-04-05', '2027-04-06']);
    expect(days[0].theme).toMatch(/Arrive/);
    expect(days[2]).toMatchObject({ theme: 'F1: Japanese Grand Prix', focus: ['logan'] });
    expect(days[1].focus).toEqual(['greyson']);
    expect(days[3].focus).toEqual(['parents']);
    expect(days[4].theme).toMatch(/Last day/);
  });

  it('keeps the anchor inside a short trip', () => {
    const days = layoutDays(plan, 2);
    expect(days[1].theme).toBe('F1: Japanese Grand Prix');
    expect(days[1].date).toBe('2027-04-04');
  });

  it('briefs a researcher with the theme, party ids, and the other days', () => {
    const days = layoutDays(plan, 4);
    const brief = briefFor(plan, days, days[2]);
    expect(brief).toContain('Theme: F1: Japanese Grand Prix.');
    expect(brief).toContain('- logan: Logan, loves racing');
    expect(brief).toContain('Day 1 (2027-04-02)');
  });
});
