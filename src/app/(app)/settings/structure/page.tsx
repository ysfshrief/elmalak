import type { Metadata } from "next";
import { getFullHierarchy } from "@/lib/queries";
import { StructureManager } from "@/components/domain/StructureManager";

export const metadata: Metadata = { title: "الهيكل التنظيمي" };

export default async function SettingsStructurePage() {
  const stages = await getFullHierarchy();
  return <StructureManager stages={stages} />;
}
