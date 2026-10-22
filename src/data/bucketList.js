// Seed bucket list. Each place lists the interests it serves:
//   f1      -> races. `f1.circuitId` is the Jolpica/Ergast circuit id, matched against the live
//              calendar; leave it out for non-F1 races. `f1.typicalMonth` (1-12) is the fallback.
//   theater -> searched on Ticketmaster near the place; `theater.bestMonths` is the fallback.
//   bike    -> scored from last year's Open-Meteo weather; `bike.bestMonths` is the fallback.
export const BUCKET_LIST = [
  {
    id: 'tokyo', name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503,
    interests: ['f1', 'theater', 'bike'],
    f1: { circuitId: 'suzuka', raceName: 'Japanese Grand Prix at Suzuka', typicalMonth: 4 },
    theater: { scene: 'Shiki Theatre musicals and Kabuki-za', bestMonths: [4, 5, 10, 11] },
    bike: { route: 'Tamagawa cycling road along the Tama River', bestMonths: [4, 5, 10, 11] },
    notes: 'Suzuka is about 2.5 hours from Tokyo by Shinkansen. Race weekend lands near cherry blossom season.',
  },
  {
    id: 'toronto', name: 'Toronto, Canada', lat: 43.6532, lng: -79.3832,
    interests: ['f1', 'theater', 'bike'],
    f1: { raceName: 'Honda Indy Toronto', typicalMonth: 7 },
    theater: { scene: 'Mirvish theatres and the Stratford Festival', bestMonths: [6, 7, 8, 9] },
    bike: { route: 'Martin Goodman Trail and the Toronto Islands', bestMonths: [6, 7, 8, 9] },
    notes: 'IndyCar street race at Exhibition Place in July. The Canadian GP in Montréal is a train ride away in June.',
  },
  {
    id: 'netherlands', name: 'Netherlands', lat: 52.3676, lng: 4.9041,
    interests: ['f1', 'bike'],
    f1: { circuitId: 'zandvoort', raceName: 'Dutch Grand Prix at Zandvoort', typicalMonth: 8 },
    bike: { route: 'Dune paths from Haarlem to the coast', bestMonths: [5, 6, 7, 8] },
    notes: 'Bike from Amsterdam to Zandvoort like the locals do on race weekend.',
  },
];
