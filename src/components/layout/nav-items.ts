import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Network,
  ClipboardCheck,
  HeartHandshake,
  Cake,
  ChartColumn,
  FileUp,
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
  { href: "/hierarchy", label: "المراحل والصفوف", icon: Network, matchPrefix: true },
  { href: "/attendance", label: "الحضور والغياب", icon: ClipboardCheck, matchPrefix: true },
  { href: "/visitation", label: "الافتقاد", icon: HeartHandshake, matchPrefix: true },
  { href: "/statistics", label: "إحصائيات الحضور", icon: ChartColumn },
  { href: "/birthdays", label: "أعياد الميلاد", icon: Cake },
  { href: "/import", label: "استيراد كشف", icon: FileUp },
  {
    href: "/settings/users",
    label: "الإعدادات",
    icon: Settings,
    roles: ["ADMIN"],
    matchPrefix: true,
  },
];

/** Subset shown in the mobile bottom nav (max 5 for touch ergonomics). */
export const MOBILE_NAV_HREFS = [
  "/dashboard",
  "/hierarchy",
  "/attendance",
  "/visitation",
  "/birthdays",
];
