import { defineTool } from "eve/tools";
import { z } from "zod";
import { BUCKET_LIST } from "../lib/data/bucketList";
import { PARTY } from "../lib/data/party";
import { describePlan, placesFor, planTrips } from "../lib/trips";

export default defineTool({
  description:
    "Find the best upcoming travel window for bucket-list places, using live F1 dates, last year's riding weather, and mock show listings. Returns why each window fits each person and a mock cost.",
  inputSchema: z.object({
    placeIds: z
      .array(z.string())
      .optional()
      .describe(`Places to plan. Omit for all. Ids: ${BUCKET_LIST.map((p) => p.id).join(", ")}`),
    who: z
      .array(z.string())
      .optional()
      .describe(`Who's going, by id: ${PARTY.map((p) => `${p.id} (${p.name})`).join(", ")}. Omit for everyone.`),
  }),
  async execute({ placeIds, who }) {
    // Only plan for the interests of the people going, and skip places none of them would love.
    const { going, places } = placesFor(placeIds, who);
    const { sources, plans } = await planTrips(places);
    return {
      going: going.map((p) => p.name),
      dataSources: sources,
      plans: plans.map((plan) => ({
        placeId: plan.place.id,
        summary: describePlan(plan),
        window: plan.window && {
          year: plan.window.year,
          month: plan.window.month,
          start: plan.window.start,
          end: plan.window.end,
          event: plan.window.title,
          confirmedDate: plan.window.live,
          mockListing: plan.window.mock ?? false,
        },
        mockCost: plan.trip,
      })),
    };
  },
});
