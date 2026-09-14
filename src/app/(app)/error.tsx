"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-error-soft text-error">
        <AlertTriangle className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-ink">تعذّر عرض هذه الصفحة</h2>
        <p className="max-w-md text-sm text-ink-muted">
          حدث خطأ أثناء تحميل البيانات. جرّب مرة أخرى، وإذا تكرر الخطأ راجع إعدادات الخادم وقاعدة البيانات.
        </p>
        {error.digest && <p className="text-xs text-ink-faint">رقم الخطأ: {error.digest}</p>}
      </div>
      <Button onClick={reset}>
        <RotateCw className="size-4" />
        إعادة المحاولة
      </Button>
    </div>
  );
}
