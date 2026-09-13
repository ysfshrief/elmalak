import type { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "مسؤول عام",
  STAGE_COORDINATOR: "مسؤول مرحلة",
  FAMILY_SERVANT: "خادم أسرة",
};

export function canManageUsers(role: Role) {
  return role === "SUPER_ADMIN";
}

export function canManageStagesAndFamilies(role: Role) {
  return role === "SUPER_ADMIN";
}
