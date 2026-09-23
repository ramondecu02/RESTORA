import { TaskScreen } from "@/components/shell/task-screen";
import { requireApp } from "@/server/ctx";
import { getCatalog } from "@/server/queries/catalog";
import { NuevoArticulo } from "./form";

export const metadata = { title: "Nuevo artículo" };

export default async function Nuevo() {
  await requireApp();
  const { cats, items } = await getCatalog();
  return (
    <TaskScreen title="Nuevo artículo" back="/articulos">
      <NuevoArticulo cats={cats.map((c) => ({ id: c.id, name: c.name, iva: c.iva }))} catalog={items.map((i) => ({ id: i.id, name: i.name, unit: i.unit, categoryId: i.category_id, rend: i.rend, aliases: i.aliases }))} />
    </TaskScreen>
  );
}
