import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <AppShell name={user.name} role={user.role} gender={user.gender}>
      {children}
    </AppShell>
  );
}
