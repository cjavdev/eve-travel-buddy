// Mocked flights and hotels. Prices are deterministic estimates from distance and
// season so the demo is stable; swap for Duffel / Amadeus when there's a key.
export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function mockTrip(home, place, { travelers = 2, nights = 3, isEventWeekend = false } = {}) {
  const km = distanceKm(home, place);
  const surge = isEventWeekend ? 1.6 : 1;
  const fare = km < 80 ? 0 : Math.round((90 + km * 0.09) * surge / 10) * 10;
  const nightly = Math.round((170 + (isEventWeekend ? 180 : 0)) / 10) * 10;
  return {
    flightPerPerson: fare,
    hotelPerNight: nightly,
    total: fare * travelers + nightly * nights,
    hours: Math.max(1, Math.round(km / 750 + 1)),
  };
}
