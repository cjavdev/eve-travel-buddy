import { defineWorkflowTool } from "eve/tools";
import { z } from "zod";
import { BUCKET_LIST } from "../lib/data/bucketList";
import { PARTY } from "../lib/data/party";
import {
  briefFor,
  buildDeck,
  type DayBrief,
  type DayResearch,
  dayResearchSchema,
  layoutDays,
  type TripDeck,
} from "../lib/itinerary";
import { placesFor, planTrips, type TripPlan } from "../lib/trips";

type PlanDaysOutput = { status: string; deck: TripDeck | null };

export default defineWorkflowTool({
  description:
    "Plan a trip day by day. Lays out the days around the best window, sends a day_researcher subagent to research every day in parallel, and shows the result in the chat as interactive slides with a map, photos, and stops for each day. Use it when the user wants to plan a specific trip or asks what to do each day.",
  inputSchema: z.object({
    placeId: z.string().describe(`The place to plan. Ids: ${BUCKET_LIST.map((p) => p.id).join(", ")}`),
    who: z
      .array(z.string())
      .optional()
      .describe(`Who's going, by id: ${PARTY.map((p) => `${p.id} (${p.name})`).join(", ")}. Omit for everyone.`),
    days: z.number().int().min(2).max(7).default(4).describe("How many days on the ground. Defaults to 4."),
  }),
  label: {
    start: ({ placeId, days }) => `Plan ${days ?? 4} days in ${placeId}`,
    delta: (_input: unknown, partial: PlanDaysOutput) => partial.status,
    complete: (_input: unknown, output: PlanDaysOutput) => (output.deck ? `Planned ${output.deck.days.length} days in ${output.deck.name}` : "No plan"),
  },
  // Each yield is a progress snapshot for the chat; the last one is the tool result.
  async *execute({ placeId, who, days }, ctx): AsyncGenerator<PlanDaysOutput> {
    "use workflow";
    const plan = await planPlace(placeId, who);
    if (!plan?.window) {
      yield { status: "No upcoming window", deck: null };
      return;
    }
    const briefs = layoutDays(plan, days ?? 4);
    yield { status: `Researching ${briefs.length} days in parallel`, deck: null };
    // One researcher per day, all at once. A failed day becomes an error slide, not a failed plan.
    const research = await Promise.all(
      briefs.map(async (brief): Promise<DayResearch | { error: string }> => {
        const response = await ctx
          .agent("day_researcher")
          .send(briefFor(plan, briefs, brief), { outputSchema: dayResearchSchema, signal: ctx.abortSignal });
        const result = await response.result();
        if (result.status === "failed" || !result.data) return { error: result.error?.message ?? "No answer" };
        return result.data as DayResearch;
      }),
    );
    yield { status: "Finding photos", deck: null };
    yield { status: "Done", deck: await makeDeck(plan, briefs, research) };
  },
  // The chat renders the full deck; the model gets the itinerary as text to talk about.
  toModelOutput({ deck }: PlanDaysOutput) {
    if (!deck) return { type: "text", value: "No upcoming window for that place and those people." };
    const lines = deck.days.map(
      (d) =>
        `Day ${d.day} (${d.date}) ${d.theme}: ${d.error ? `research failed (${d.error})` : d.stops.map((s) => `${s.time} ${s.name}`).join("; ")}`,
    );
    return { type: "text", value: `Showing a ${deck.days.length}-day slide deck for ${deck.name} in the chat.\n${lines.join("\n")}` };
  },
});

async function planPlace(placeId: string, who: string[] | undefined): Promise<TripPlan | null> {
  "use step";
  const { places } = placesFor([placeId], who);
  const { plans } = await planTrips(places);
  return plans[0] ?? null;
}

async function makeDeck(plan: TripPlan, briefs: DayBrief[], research: (DayResearch | { error: string })[]) {
  "use step";
  return buildDeck(plan, briefs, research);
}
