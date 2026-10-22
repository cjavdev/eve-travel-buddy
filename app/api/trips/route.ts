import { planTrips } from "@/agent/lib/trips";

// The map's data: every bucket-list place planned with the same code the agent's tools use.
export async function GET() {
  return Response.json(await planTrips());
}
