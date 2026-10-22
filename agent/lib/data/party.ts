import type { Interest, Person } from '../types';

// Who travels, and what each of them loves. Interests drive pin colors:
// a place is colored by every party member whose interest it matches.
export const PARTY: Person[] = [
  { id: 'greyson', name: 'Greyson', interest: 'theater', color: '#8b5cf6', emoji: '🎭', travelers: 1 },
  { id: 'logan', name: 'Logan', interest: 'racing', color: '#ef4444', emoji: '🏎️', travelers: 1 },
  { id: 'parents', name: 'CJ & wife', interest: 'bike', color: '#10b981', emoji: '🚴', travelers: 2 },
];

// Origin for the mock flight estimates. Change to your home airport.
export const HOME = { name: 'San Francisco', code: 'SFO', lat: 37.62, lng: -122.38 };

export function peopleFor(interests: Interest[]): Person[] {
  return PARTY.filter((p) => interests.includes(p.interest));
}
