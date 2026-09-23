import { TaskScreen } from "@/components/shell/task-screen";
import { Uploader } from "@/components/uploader";
import { requireApp } from "@/server/ctx";

export const metadata = { title: "Subir carta" };

export default async function SubirCarta() {
  await requireApp();
  return (
    <TaskScreen title="Subir la carta" back="/carta">
      <Uploader kind="carta" cta="Leer carta" sample={[{ url: "/demo/carta-ejemplo.jpg", name: "carta-ejemplo.jpg", title: "Probar con una carta de ejemplo", sub: "7 platos y bebidas con precio" }]} />
    </TaskScreen>
  );
}
