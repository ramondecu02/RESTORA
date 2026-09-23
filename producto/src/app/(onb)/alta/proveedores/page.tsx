import { requireOnboarding } from "@/server/ctx";
import { proveedoresAlta } from "@/server/queries/onboarding";
import { ProveedoresAlta } from "./list";

export const metadata = { title: "Tus proveedores" };

export default async function ProveedoresPage() {
  const { org } = await requireOnboarding();
  const list = await proveedoresAlta(org.id);
  return <ProveedoresAlta initial={list} />;
}
