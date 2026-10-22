import { defineTool } from "eve/tools";
import { z } from "zod";
import { fetchF1Calendar } from "../lib/sources/f1";

export default defineTool({
  description: "Get F1 race dates for this season and next from the free Jolpica calendar.",
  inputSchema: z.object({}),
  async execute() {
    const races = await fetchF1Calendar();
    return races.length
      ? { races: races.map(({ season, raceName, circuitName, date }) => ({ season, raceName, circuitName, date })) }
      : { races: [], note: "The F1 calendar couldn't be reached right now." };
  },
});
