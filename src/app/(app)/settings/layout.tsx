import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { buildInfo } from "@/lib/version";
import { SettingsTabs } from "@/components/domain/SettingsTabs";
import { PhotoStorageStatus } from "@/components/domain/PhotoStorageStatus";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN"]);
  const build = buildInfo();

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-ink">الإعدادات</h1>
        <p className="mt-1 text-sm text-ink-muted">إدارة المستخدمين والهيكل التنظيمي</p>
      </div>
      <SettingsTabs />
      {children}
      {/* الفحص يتصل بخزنة خارجية، فلا يُؤخَّر عرض الصفحة من أجله. */}
      <Suspense fallback={null}>
        <PhotoStorageStatus />
      </Suspense>
      <p className="pt-2 text-center text-xs text-ink-faint">
        إصدار الموقع: {build.commit}
        {build.branch && ` — ${build.branch}`}
        {build.message && (
          <>
            <br />
            {build.message}
          </>
        )}
      </p>
    </div>
  );
}
