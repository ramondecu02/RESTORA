import { requireOnboarding } from "@/server/ctx";
import { BriefingWizard } from "./wizard";

export const metadata = { title: "Tu negocio" };

export default async function Briefing({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { org } = await requireOnboarding();
  const sp = await searchParams;
  return <BriefingWizard restName={org.name} initial={org.briefing as Record<string, string>} editar={sp.editar === "1"} />;
}
