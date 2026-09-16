import { CheckCircle2, AlertTriangle, ImageOff } from "lucide-react";
import { checkPhotoStorage, isPhotoStorageConfigured } from "@/lib/photo-storage";

/**
 * حالة خزنة صور المخدومين.
 *
 * ضبط الخزنة يتم بمتغيّرات بيئة لا يراها أحد، وخطأٌ فيها لا يظهر إلا عند
 * أول محاولة رفع. فهذا الفحص يجيب عن السؤال قبل أن يُسأل: هل المفتاح صحيح،
 * وهل الحاوية موجودة، وهل ما تزال خاصة؟
 */
export async function PhotoStorageStatus() {
  if (!isPhotoStorageConfigured()) {
    return (
      <Row
        icon={ImageOff}
        tone="text-ink-faint"
        title="خزنة الصور غير مفعّلة"
        detail="لن يظهر حقل الصورة حتى تُضبط متغيّرات البيئة على الخادم."
      />
    );
  }

  const result = await checkPhotoStorage();
  if (!result.ok) {
    return (
      <Row
        icon={AlertTriangle}
        tone="text-error"
        title="خزنة الصور لا تعمل"
        detail={result.reason}
      />
    );
  }

  return (
    <Row
      icon={CheckCircle2}
      tone="text-success"
      title="خزنة الصور تعمل"
      detail={`الحاوية: ${result.bucket} — خاصة`}
    />
  );
}

function Row({
  icon: Icon,
  tone,
  title,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface p-3">
      <Icon className={`mt-0.5 size-4.5 shrink-0 ${tone}`} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="text-xs text-ink-muted">{detail}</p>
      </div>
    </div>
  );
}
