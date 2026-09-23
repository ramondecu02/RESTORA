import { one, sys } from "../db";
import { sha256 } from "../crypto";

export type Inv = { id: string; org_id: string; org_name: string; email: string; role: string; expires_at: Date; accepted_at: Date | null };
export async function findInvitation(token: string): Promise<Inv | null> {
  if (!token || token.length > 100) return null;
  const inv = await sys((c) => one<Inv>(c,
    "select i.id, i.org_id, o.name as org_name, i.email, i.role, i.expires_at, i.accepted_at from invitations i join organizations o on o.id = i.org_id where i.token_hash = $1",
    [sha256(token)]));
  if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) return null;
  return inv;
}

