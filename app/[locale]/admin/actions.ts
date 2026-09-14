"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkAdminCredentials } from "@/lib/auth";
import { endSession, isAdminAuthed, startSession } from "@/lib/session";
import { updateLead } from "@/lib/leads";
import { DEFAULT_LOCALE, isLeadStatus, isLocale } from "@/lib/types";

function safeLocale(value: FormDataEntryValue | null) {
  const raw = String(value ?? "");
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

// Only allow same-origin, non-protocol-relative redirect targets.
function safePath(value: string, fallback: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const locale = safeLocale(formData.get("locale"));
  const next = safePath(String(formData.get("next") ?? ""), `/${locale}/admin/leads`);

  if (!checkAdminCredentials(email, password)) {
    redirect(`/${locale}/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }

  await startSession();
  redirect(next);
}

export async function logoutAction(formData: FormData) {
  const locale = safeLocale(formData.get("locale"));
  await endSession();
  redirect(`/${locale}/admin/login`);
}

export async function updateLeadAction(formData: FormData) {
  if (!(await isAdminAuthed())) {
    redirect("/");
  }

  const id = String(formData.get("id") ?? "");
  const locale = safeLocale(formData.get("locale"));
  const statusRaw = String(formData.get("status") ?? "");
  const notesRaw = String(formData.get("notes") ?? "").trim();

  if (!id) {
    redirect(`/${locale}/admin/leads`);
  }

  const patch: { status?: string; notes?: string | null } = {
    notes: notesRaw ? notesRaw.slice(0, 2000) : null,
  };
  if (isLeadStatus(statusRaw)) patch.status = statusRaw;

  await updateLead(id, patch);
  revalidatePath(`/${locale}/admin/leads/${id}`);
  revalidatePath(`/${locale}/admin/leads`);
  redirect(`/${locale}/admin/leads/${id}?saved=1`);
}
