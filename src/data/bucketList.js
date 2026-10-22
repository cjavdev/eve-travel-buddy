// Seed bucket list. Each place lists the interests it serves:
//   racing  -> a list of race weekends in any series. Give F1 races the Jolpica/Ergast
//              `circuitId` so they pick up the live calendar; every race falls back to `typicalMonth` (1-12).
//   theater -> searched on Ticketmaster near the place; `theater.bestMonths` is the fallback.
//   bike    -> scored from last year's Open-Meteo weather; `bike.bestMonths` is the fallback.
export const BUCKET_LIST = [
  {
    id: 'tokyo', name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503,
    interests: ['racing', 'theater', 'bike'],
    racing: [
      { series: 'F1', name: 'Japanese Grand Prix at Suzuka', circuitId: 'suzuka', typicalMonth: 4 },
      { series: 'Super GT', name: 'Fuji 3 Hours at Fuji Speedway', typicalMonth: 5 },
    ],
    theater: { scene: 'Shiki Theatre musicals and Kabuki-za', bestMonths: [4, 5, 10, 11] },
    bike: { route: 'Tamagawa cycling road along the Tama River', bestMonths: [4, 5, 10, 11] },
    notes: 'Suzuka is about 2.5 hours by Shinkansen; Fuji Speedway is under 2 hours and runs Super GT over Golden Week.',
  },
  {
    id: 'toronto', name: 'Toronto, Canada', lat: 43.6532, lng: -79.3832,
    interests: ['racing', 'theater', 'bike'],
    racing: [{ series: 'IndyCar', name: 'Honda Indy Toronto', typicalMonth: 7 }],
    theater: { scene: 'Mirvish theatres and the Stratford Festival', bestMonths: [6, 7, 8, 9] },
    bike: { route: 'Martin Goodman Trail and the Toronto Islands', bestMonths: [6, 7, 8, 9] },
    notes: 'IndyCar street race at Exhibition Place in July. The Canadian GP in Montréal is a train ride away in June.',
  },
  {
    id: 'netherlands', name: 'Netherlands', lat: 52.3676, lng: 4.9041,
    interests: ['racing', 'bike'],
    racing: [{ series: 'MotoGP', name: 'Dutch TT at Assen', typicalMonth: 6 }],
    bike: { route: 'Dune paths from Haarlem to the coast', bestMonths: [5, 6, 7, 8] },
    notes: 'F1 left Zandvoort after 2026, so the big race weekend is now the Dutch TT motorcycle GP at Assen.',
  },
];
