import "server-only";
import { prisma } from "@/lib/prisma";
import type { Role, User } from "@prisma/client";

export { ROLE_LABELS, canManageUsers, canManageStagesAndFamilies } from "@/lib/roles";

type ScopedUser = {
  id: string;
  role: Role;
  stageId: string | null;
  assignments: { familyId: string }[];
};

/**
 * Returns the list of family IDs a user may access, or `null` when the
 * user (SUPER_ADMIN) can access every family.
 */
export async function getAccessibleFamilyIds(user: ScopedUser): Promise<string[] | null> {
  if (user.role === "SUPER_ADMIN") return null;

  if (user.role === "STAGE_COORDINATOR") {
    if (!user.stageId) return [];
    const families = await prisma.family.findMany({
      where: { stageId: user.stageId },
      select: { id: true },
    });
    return families.map((f) => f.id);
  }

  // FAMILY_SERVANT
  return user.assignments.map((a) => a.familyId);
}

export async function canAccessFamily(user: ScopedUser, familyId: string) {
  const ids = await getAccessibleFamilyIds(user);
  if (ids === null) return true;
  return ids.includes(familyId);
}

export type { User };
