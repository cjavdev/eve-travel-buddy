import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Research one day of a family trip: real places, times, and how to get between them, for the people named in the brief.",
  model: "anthropic/claude-opus-5.5",
  // Only plan_days calls it, once per day in parallel; the parent model never sees it.
  tool: false,
});
