import { defineTool } from "eve/tools";
import { z } from "zod";
import { BUCKET_LIST } from "../lib/data/bucketList";
import { HOME, peopleFor } from "../lib/data/party";

export default defineTool({
  description:
    "List the family's bucket-list places, who would love each one, and the races, theater, and bike routes there.",
  inputSchema: z.object({}),
  async execute() {
    return {
      home: HOME,
      places: BUCKET_LIST.map((place) => ({
        id: place.id,
        name: place.name,
        lovedBy: peopleFor(place.interests).map((p) => p.name),
        racing: place.racing?.map((r) => `${r.series}: ${r.name}`),
        theater: place.theater?.scene,
        bike: place.bike?.route,
        notes: place.notes,
      })),
    };
  },
});
