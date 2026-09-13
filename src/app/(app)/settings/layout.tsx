import { requireRole } from "@/lib/auth";
import { SettingsTabs } from "@/components/domain/SettingsTabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["SUPER_ADMIN"]);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-ink">الإعدادات</h1>
        <p className="mt-1 text-sm text-ink-muted">إدارة المستخدمين والمراحل والأسر</p>
      </div>
      <SettingsTabs />
      {children}
    </div>
  );
}
