import { Prisma, type Lead } from "@prisma/client";
import { prisma } from "./db";
import type { LeadInput } from "./validation";

export type { Lead };

export interface LeadFilters {
  city?: string;
  status?: string;
  q?: string;
}

export interface LeadStats {
  total: number;
  newThisWeek: number;
}

function buildWhere(filters: LeadFilters): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.city) {
    where.city = { contains: filters.city, mode: "insensitive" };
  }
  if (filters.q) {
    where.restaurant = { contains: filters.q, mode: "insensitive" };
  }
  return where;
}

/** Persist a new lead from the public form. */
export function createLead(input: LeadInput): Promise<Lead> {
  return prisma.lead.create({
    data: {
      restaurant: input.restaurant,
      role: input.role,
      city: input.city,
      pos: input.pos,
      lang: input.lang,
      message: input.message,
      source: "landing",
    },
  });
}

/** List leads (newest first) with optional city/status/name filters. */
export function listLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  return prisma.lead.findMany({
    where: buildWhere(filters),
    orderBy: { createdAt: "desc" },
  });
}

export function getLead(id: string): Promise<Lead | null> {
  return prisma.lead.findUnique({ where: { id } });
}

export function updateLead(
  id: string,
  patch: { status?: string; notes?: string | null },
): Promise<Lead> {
  return prisma.lead.update({ where: { id }, data: patch });
}

function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  // Monday as the first day of the week.
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

/** Total count + leads created since Monday, for the admin header. */
export async function getLeadStats(): Promise<LeadStats> {
  const [total, newThisWeek] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: startOfWeek() } } }),
  ]);
  return { total, newThisWeek };
}
