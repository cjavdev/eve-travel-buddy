import { AgentChat } from "@/app/_components/agent-chat";

export default async function NewSessionPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <AgentChat initialPrompt={q} sessionless />;
}
