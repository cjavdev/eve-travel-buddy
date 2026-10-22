import { defineTool } from "eve/tools";
import { z } from "zod";
import { BUCKET_LIST } from "../lib/data/bucketList";
import { PARTY } from "../lib/data/party";
import { buildReel } from "../lib/reel";
import { placesFor, planTrips } from "../lib/trips";

export default defineTool({
  description:
    "Make a short vertical video reel for each proposed trip: a flight map from home, a zoom into the place, and photos of what each person will love. The chat shows the reels as a scrollable feed. Call it right after you propose one or more trips.",
  inputSchema: z.object({
    placeIds: z
      .array(z.string())
      .min(1)
      .describe(`Places you proposed, best first. Ids: ${BUCKET_LIST.map((p) => p.id).join(", ")}`),
    who: z
      .array(z.string())
      .optional()
      .describe(`Who's going, by id: ${PARTY.map((p) => `${p.id} (${p.name})`).join(", ")}. Omit for everyone.`),
  }),
  label: {
    start: ({ placeIds }) => `Make trip reels for ${placeIds.join(", ")}`,
  },
  async execute({ placeIds, who }) {
    const { places } = placesFor(placeIds, who);
    const { plans } = await planTrips(places);
    // Keep the order the agent asked for, so its top pick is the first reel.
    plans.sort((a, b) => placeIds.indexOf(a.place.id) - placeIds.indexOf(b.place.id));
    const reels = (await Promise.all(plans.map(buildReel))).filter((r) => r !== null);
    return { reels };
  },
  // The chat renders the full reels; the model only needs to know they exist.
  toModelOutput({ reels }) {
    const lines = reels.map((r) => `${r.name}: ${r.headline}, ${r.when} (${r.gallery.length + r.beats.reduce((n, b) => n + b.photos.length, 0)} photos)`);
    return {
      type: "text",
      value: reels.length
        ? `Showing ${reels.length} reel(s) in the chat, scrollable:\n${lines.join("\n")}`
        : "No reels: none of those places has an upcoming window for who's going.",
    };
  },
});
