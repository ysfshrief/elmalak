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

/**
 * الأربعة التي تشغل شريط الهاتف السفلي، والخانة الخامسة لزرّ «المزيد».
 *
 * الشريط لا يتسع لكل شيء، لكن ما لا يتسع له لا يجوز أن يصير غير موجود:
 * كل ما ليس هنا يظهر في لوحة «المزيد»، فلا تبقى صفحةٌ لا يُوصل إليها إلا
 * بكتابة رابطها.
 */
export const MOBILE_NAV_HREFS = [
  "/dashboard",
  "/hierarchy",
  "/attendance",
  "/visitation",
];

/** ما عدا ذلك — يُعرض في لوحة «المزيد» على الهاتف. */
export function mobileOverflowItems(role: Role) {
  return NAV_ITEMS.filter(
    (item) => !MOBILE_NAV_HREFS.includes(item.href) && (!item.roles || item.roles.includes(role))
  );
}
