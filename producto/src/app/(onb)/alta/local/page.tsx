import { redirect } from "next/navigation";
import { hasPerm, requireOnboarding, loadLocal } from "@/server/ctx";
import { LocalForm } from "./form";

export const metadata = { title: "Tu local" };

export default async function LocalPage() {
  const { org } = await requireOnboarding();
  const l = await loadLocal(org.id);
  // Con el alta terminada, el local se edita en Cuenta. Si falta el local, la app manda aquí a todos: no se redirige para no entrar en bucle.
  if (l && (org.onboardingDone || !hasPerm(org, "local:editar"))) redirect("/hoy");
  return <LocalForm initial={{ name: l?.name ?? org.name, address: l?.address ?? "", postal_code: l?.postal_code ?? "", ciudad: l?.ciudad ?? "", iva_venta: l?.iva_venta ?? 10, fc_objetivo: l?.fc_objetivo ?? 30, comensales_dia: l?.comensales_dia ?? null }} />;
}
