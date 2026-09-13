import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { StructureManager } from "@/components/domain/StructureManager";

export const metadata: Metadata = { title: "المراحل والأسر" };

export default async function SettingsStructurePage() {
  const stages = await prisma.stage.findMany({
    orderBy: { order: "asc" },
    include: {
      families: {
        include: { _count: { select: { members: true } } },
        orderBy: { name: "asc" },
      },
    },
  });

  return <StructureManager stages={stages} />;
}
