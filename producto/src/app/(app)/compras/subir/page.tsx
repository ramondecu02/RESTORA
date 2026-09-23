import { redirect } from "next/navigation";
import { Uploader } from "@/components/uploader";
import { TaskScreen } from "@/components/shell/task-screen";
import { requireApp, hasPerm } from "@/server/ctx";

export const metadata = { title: "Subir albarán" };

export default async function Subir() {
  const ctx = await requireApp();
  if (!hasPerm(ctx, "compras")) redirect("/compras");
  return (
    <TaskScreen title="Subir albarán" back="/compras">
      <Uploader kind="albaran" cta="Leer albarán" sample={[
        { url: "/demo/albaran-ejemplo.jpg", name: "albaran-ejemplo.jpg", title: "Probar con un albarán de ejemplo", sub: "Distribuciones Martínez · 12 líneas" },
        { url: "/demo/albaran-gil.jpg", name: "albaran-gil.jpg", title: "Otro de ejemplo, de otro proveedor", sub: "Frutas Hermanos Gil · 5 líneas" },
      ]} />
    </TaskScreen>
  );
}
