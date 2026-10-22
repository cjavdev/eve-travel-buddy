import type { Interest, Person } from '../types';

// Who travels, and what each of them loves. Interests decide who each pin is for:
// a place belongs to every party member whose interest it matches. Colors are
// monochrome tones to match the Vercel-style UI.
export const PARTY: Person[] = [
  { id: 'greyson', name: 'Greyson', interest: 'theater', color: '#ededed', emoji: '🎭', travelers: 1 },
  { id: 'friends', name: 'Travis & Lorena', interest: 'beach', color: '#c4c4c4', emoji: '🏖️', travelers: 2 },
  { id: 'logan', name: 'Logan', interest: 'racing', color: '#8f8f8f', emoji: '🏎️', travelers: 1 },
  { id: 'parents', name: 'CJ & wife', interest: 'bike', color: '#5f5f5f', emoji: '🚴', travelers: 2 },
];

// Origin for the mock flight estimates. Change to your home airport.
export const HOME = { name: 'San Francisco', code: 'SFO', lat: 37.62, lng: -122.38 };

export function peopleFor(interests: Interest[]): Person[] {
  return PARTY.filter((p) => interests.includes(p.interest));
}
