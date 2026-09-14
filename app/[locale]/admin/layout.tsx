import { notFound } from "next/navigation";
import { isLocale } from "@/lib/types";
import { isAdminAuthed } from "@/lib/session";
import { AdminHeader } from "@/components/admin/admin-header";

export default async function AdminLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const authed = await isAdminAuthed();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      {authed && <AdminHeader locale={locale} />}
      {props.children}
    </div>
  );
}
