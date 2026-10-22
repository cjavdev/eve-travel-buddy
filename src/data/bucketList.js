// Seed bucket list. Each place lists the interests it serves:
//   f1      -> `f1.circuitId` is the Jolpica/Ergast circuit id, matched against the live calendar.
//              `f1.typicalMonth` (1-12) is the fallback when the calendar can't be fetched.
//   theater -> searched on Ticketmaster near the place; `theater.bestMonths` is the fallback.
//   bike    -> scored from last year's Open-Meteo weather; `bike.bestMonths` is the fallback.
export const BUCKET_LIST = [
  {
    id: 'austin', name: 'Austin, Texas', lat: 30.2672, lng: -97.7431,
    interests: ['f1', 'bike'],
    f1: { circuitId: 'americas', raceName: 'United States Grand Prix', typicalMonth: 10 },
    bike: { route: 'Hill Country loops out of Dripping Springs', bestMonths: [3, 4, 10, 11] },
    notes: 'COTA weekend plus a Hill Country ride the day after.',
  },
  {
    id: 'montreal', name: 'Montréal, Canada', lat: 45.5019, lng: -73.5674,
    interests: ['f1', 'bike'],
    f1: { circuitId: 'villeneuve', raceName: 'Canadian Grand Prix', typicalMonth: 6 },
    bike: { route: 'Lachine Canal and the Route Verte', bestMonths: [6, 7, 8, 9] },
    notes: 'You can ride a bike lap of Circuit Gilles Villeneuve on non-race days.',
  },
  {
    id: 'london', name: 'London & Silverstone', lat: 51.5072, lng: -0.1276,
    interests: ['f1', 'theater'],
    f1: { circuitId: 'silverstone', raceName: 'British Grand Prix', typicalMonth: 7 },
    theater: { scene: 'West End', bestMonths: [7, 8, 12] },
    notes: 'West End matinee for Greyson, Silverstone for Logan, same trip.',
  },
  {
    id: 'nyc', name: 'New York City', lat: 40.7590, lng: -73.9845,
    interests: ['theater'],
    theater: { scene: 'Broadway', bestMonths: [4, 6, 12] },
    notes: 'Spring openings, Tony season in June, and the holiday shows.',
  },
  {
    id: 'chicago', name: 'Chicago', lat: 41.8781, lng: -87.6298,
    interests: ['theater', 'bike'],
    theater: { scene: 'Broadway in Chicago', bestMonths: [5, 6, 9] },
    bike: { route: 'Lakefront Trail, 18 miles end to end', bestMonths: [6, 7, 8, 9] },
    notes: 'Summer evenings on the Lakefront Trail, shows in the Loop.',
  },
  {
    id: 'ashland', name: 'Ashland, Oregon', lat: 42.1946, lng: -122.7095,
    interests: ['theater', 'bike'],
    theater: { scene: 'Oregon Shakespeare Festival', bestMonths: [6, 7, 8, 9] },
    bike: { route: 'Bear Creek Greenway and Dead Indian Memorial climb', bestMonths: [5, 6, 9, 10] },
    notes: 'Festival season runs spring to fall.',
  },
  {
    id: 'vegas', name: 'Las Vegas', lat: 36.1147, lng: -115.1728,
    interests: ['f1', 'theater', 'bike'],
    f1: { circuitId: 'vegas', raceName: 'Las Vegas Grand Prix', typicalMonth: 11 },
    theater: { scene: 'Strip residencies and touring shows', bestMonths: [11, 12, 3] },
    bike: { route: 'Red Rock Canyon scenic loop', bestMonths: [3, 4, 10, 11] },
    notes: 'The one pin everyone wants: night race, a show, and Red Rock.',
  },
  {
    id: 'monaco', name: 'Monaco & the Riviera', lat: 43.7384, lng: 7.4246,
    interests: ['f1', 'bike'],
    f1: { circuitId: 'monaco', raceName: 'Monaco Grand Prix', typicalMonth: 6 },
    bike: { route: 'Col de la Madone and the coast road to Nice', bestMonths: [4, 5, 9, 10] },
    notes: 'Wait until Logan is old enough to enjoy the walk around the harbor.',
  },
  {
    id: 'zandvoort', name: 'Amsterdam & Zandvoort', lat: 52.3676, lng: 4.9041,
    interests: ['f1', 'bike'],
    f1: { circuitId: 'zandvoort', raceName: 'Dutch Grand Prix', typicalMonth: 8 },
    bike: { route: 'Dune paths from Haarlem to the coast', bestMonths: [5, 6, 7, 8] },
    notes: 'Bike to the circuit like the locals do.',
  },
  {
    id: 'melbourne', name: 'Melbourne, Australia', lat: -37.8136, lng: 144.9631,
    interests: ['f1', 'theater'],
    f1: { circuitId: 'albert_park', raceName: 'Australian Grand Prix', typicalMonth: 3 },
    theater: { scene: 'Melbourne theatre district', bestMonths: [3, 4] },
    notes: 'Season opener. Long flight, so make it a two-week trip.',
  },
  {
    id: 'suzuka', name: 'Suzuka & Kyoto, Japan', lat: 34.8431, lng: 136.5410,
    interests: ['f1', 'bike'],
    f1: { circuitId: 'suzuka', raceName: 'Japanese Grand Prix', typicalMonth: 4 },
    bike: { route: 'Lake Biwa loop (Biwaichi)', bestMonths: [4, 5, 10, 11] },
    notes: 'Cherry blossom season lines up with race weekend.',
  },
  {
    id: 'girona', name: 'Girona, Spain', lat: 41.9794, lng: 2.8214,
    interests: ['bike'],
    bike: { route: 'Rocacorba climb and the Costa Brava coast', bestMonths: [4, 5, 9, 10] },
    notes: 'Pro-cyclist base camp. Just the two of you.',
  },
  {
    id: 'mallorca', name: 'Mallorca, Spain', lat: 39.6953, lng: 3.0176,
    interests: ['bike'],
    bike: { route: 'Sa Calobra and the Tramuntana', bestMonths: [3, 4, 5, 10] },
    notes: 'Quiet roads in spring before the summer crowds.',
  },
  {
    id: 'stratford', name: 'Stratford, Ontario', lat: 43.3700, lng: -80.9822,
    interests: ['theater'],
    theater: { scene: 'Stratford Festival', bestMonths: [6, 7, 8, 9] },
    notes: 'Repertory festival; can pair with Montréal in June.',
  },
];
