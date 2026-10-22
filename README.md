# Eve Travel Buddy

A family trip planner built on [eve](https://eve.dev), Vercel's agent framework. It has two parts:

- **Bucket-list map** (`/`): every place we want to go, pinned and colored by who would love it, with the best upcoming window, why it fits each person, and a rough cost.
- **Travel Buddy agent** (`/s`): a chat agent that plans trips with the same data. Each pin has a "Plan this with Travel Buddy" button.

| Who | Loves | Pin color |
| --- | --- | --- |
| Greyson | Theater | purple |
| Logan | Car racing (any series) | red |
| CJ & wife | Long bike rides | green |

## Run it

Needs Node 24.

```sh
npm install
npx eve link        # once: connects AI Gateway for the model (or set AI_GATEWAY_API_KEY in .env.local)
npm run dev         # Next.js + the eve agent, http://localhost:3000
npm test
npm run dev:eve     # optional: chat with the agent in the terminal
```

## Deploy

Import the repo at [vercel.com/new](https://vercel.com/new), or run `npx eve deploy`. On Vercel the agent reaches AI Gateway without a key. `agent/channels/eve.ts` currently allows anonymous chat for the demo; swap `none()` for real auth before sharing widely.

## Data sources (all free)

| Data | Source | Key |
| --- | --- | --- |
| Map tiles | OpenStreetMap via Leaflet | none |
| F1 race dates | [Jolpica](https://github.com/jolpica/jolpica-f1) (Ergast successor) | none |
| Riding weather | [Open-Meteo](https://open-meteo.com) archive, last full year scored by month | none |
| Theater shows | [Ticketmaster Discovery](https://developer.ticketmaster.com) free tier | optional `TICKETMASTER_KEY` env var |
| Flights and hotels | Mocked from distance and event weekends | none |

Every source has a fallback: races use their typical month (only F1 has a live calendar), and theater and riding use the seeded best months.

## Where things live

- `agent/instructions.md`: the agent's prompt.
- `agent/tools/`: `list_bucket_list`, `plan_trips`, `f1_calendar`, `ride_weather`.
- `agent/lib/data/`: the bucket list (`bucketList.ts`) and who's going (`party.ts`, including `HOME` for mock flights).
- `agent/lib/planner.ts`: picks the best window, favoring months that serve the most people, dated events, and sooner trips.
- `agent/lib/trips.ts`: gathers every source and plans each place; used by both the tools and `app/api/trips`.
- `app/`: the Next.js map page and the generated eve Web Chat.
