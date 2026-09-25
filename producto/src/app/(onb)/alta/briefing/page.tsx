import { redirect } from "next/navigation";
import { requireOnboarding } from "@/server/ctx";
import { BriefingWizard } from "./wizard";

export const metadata = { title: "Tu negocio" };

// El briefing es del negocio: solo lo contesta el propietario. Con el alta terminada, el asistente sirve para cambiar respuestas.
export default async function Briefing() {
  const { org } = await requireOnboarding();
  if (org.role !== "propietario") redirect("/hoy");
  return <BriefingWizard restName={org.name} initial={org.briefing as Record<string, string>} editar={org.onboardingDone} />;
}
