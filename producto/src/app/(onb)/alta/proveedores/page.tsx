import { redirect } from "next/navigation";
import { hasPerm, requireOnboarding } from "@/server/ctx";
import { proveedoresAlta } from "@/server/queries/onboarding";
import { ProveedoresAlta } from "./list";

export const metadata = { title: "Tus proveedores" };

export default async function ProveedoresPage() {
  const { org } = await requireOnboarding();
  // El alta es del propietario; terminada, los proveedores se gestionan en Proveedores.
  if (org.onboardingDone || !hasPerm(org, "local:editar")) redirect("/hoy");
  const list = await proveedoresAlta(org.id);
  return <ProveedoresAlta initial={list} />;
}
