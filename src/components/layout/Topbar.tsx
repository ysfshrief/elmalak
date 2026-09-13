import type { Role } from "@prisma/client";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { ChurchLogo } from "./ChurchLogo";

export function Topbar({ name, role }: { name: string; role: Role }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/90 backdrop-blur px-4 sm:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <ChurchLogo className="size-8 shrink-0" />
        <span className="text-sm font-extrabold text-ink">التربية الكنسية</span>
      </div>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <UserMenu name={name} role={role} />
      </div>
    </header>
  );
}
