import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  HeartHandshake,
  Cake,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  matchPrefix?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/families", label: "الأسر والمخدومين", icon: Users, matchPrefix: true },
  { href: "/attendance", label: "الحضور والغياب", icon: ClipboardCheck, matchPrefix: true },
  { href: "/visitation", label: "الافتقاد", icon: HeartHandshake, matchPrefix: true },
  { href: "/birthdays", label: "أعياد الميلاد", icon: Cake },
  {
    href: "/settings/users",
    label: "الإعدادات",
    icon: Settings,
    roles: ["SUPER_ADMIN"],
    matchPrefix: true,
  },
];

/** Subset shown in the mobile bottom nav (max 5 for touch ergonomics). */
export const MOBILE_NAV_HREFS = ["/dashboard", "/families", "/attendance", "/visitation", "/birthdays"];
