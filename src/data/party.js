// Who travels, and what each of them loves. Interests drive pin colors:
// a place is colored by every party member whose interest it matches.
export const PARTY = [
  { id: 'greyson', name: 'Greyson', interest: 'theater', color: '#8b5cf6', emoji: '🎭' },
  { id: 'logan', name: 'Logan', interest: 'f1', color: '#ef4444', emoji: '🏎️' },
  { id: 'parents', name: 'CJ & wife', interest: 'bike', color: '#10b981', emoji: '🚴' },
];

// Origin for the mock flight estimates. Change to your home airport.
export const HOME = { name: 'San Francisco', code: 'SFO', lat: 37.62, lng: -122.38 };

export function peopleFor(interests) {
  return PARTY.filter((p) => interests.includes(p.interest));
}
