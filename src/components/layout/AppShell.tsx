import type { Role, Gender } from "@prisma/client";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Topbar } from "./Topbar";
import { Footer } from "./Footer";

export function AppShell({
  name,
  role,
  gender,
  children,
}: {
  name: string;
  role: Role;
  gender: Gender | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={name} role={role} gender={gender} />
        <main className="flex flex-1 flex-col pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</div>
          <Footer />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
