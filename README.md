# Eve Travel Buddy

A family travel agent built at the Eve hackathon. The first piece is the **bucket-list map**: every place we want to go, pinned and colored by who would love it, with the best upcoming window to go.

| Who | Loves | Pin color |
| --- | --- | --- |
| Greyson | Theater | purple |
| Logan | Car racing | red |
| CJ & wife | Long bike rides | green |

A pin with several colors serves several people. Click it to see the best upcoming window, why it fits each person, and a rough cost. The chips at the top filter pins by who's going.

## Run it

```sh
npm install
npm run dev     # http://localhost:5173
npm test
```

## Data sources (all free)

| Data | Source | Key? |
| --- | --- | --- |
| Map tiles | OpenStreetMap via Leaflet | none |
| Race dates (F1) | [Jolpica](https://github.com/jolpica/jolpica-f1) (Ergast successor) | none |
| Riding weather | [Open-Meteo](https://open-meteo.com) historical archive, last full year scored by month | none |
| Theater shows | [Ticketmaster Discovery](https://developer.ticketmaster.com) free tier | optional: put `VITE_TICKETMASTER_KEY` in `.env.local` |
| Flights and hotels | Mocked from distance and event weekends (`src/sources/mockTravel.js`) | none |

Every source has a fallback, so the map still works offline: races use their typical month (only F1 has a live calendar; other series always do), theater and riding use the seeded best months. The footer shows which sources are live. Responses are cached in localStorage for 12 hours.

## Where things live

- `src/data/bucketList.js`: the seed bucket list. Tokyo, Toronto, and the Netherlands. Each place can list races in any series. Add a place with its interests and fallback months.
- `src/data/party.js`: who's going, their colors, and `HOME` for the mock flight origin.
- `src/planner.js`: picks the best upcoming window, favoring months that serve the most people and real dated events.
- `src/sources/`: one file per data source.
