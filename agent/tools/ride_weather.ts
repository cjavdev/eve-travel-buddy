import { defineTool } from "eve/tools";
import { z } from "zod";
import { BUCKET_LIST } from "../lib/data/bucketList";
import { monthName } from "../lib/planner";
import { fetchRideClimate } from "../lib/sources/weather";

export default defineTool({
  description:
    "Month-by-month weather for a place, from last year's Open-Meteo data: average high, wet days, and 0-1 scores for long rides and beach days.",
  inputSchema: z.object({ placeId: z.enum(BUCKET_LIST.map((p) => p.id) as [string, ...string[]]) }),
  async execute({ placeId }) {
    const place = BUCKET_LIST.find((p) => p.id === placeId)!;
    const months = await fetchRideClimate(place);
    return {
      place: place.name,
      months: months.map((m) => ({
        month: monthName(m.month),
        avgHighC: m.avgHighC == null ? null : Math.round(m.avgHighC),
        wetDays: m.rainyDays,
        rideScore: Math.round(m.score * 100) / 100,
        beachScore: Math.round(m.beachScore * 100) / 100,
      })),
    };
  },
});
