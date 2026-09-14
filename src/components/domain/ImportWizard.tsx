"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label, Select, FieldHint } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ImportReviewRow } from "@/components/domain/ImportReviewRow";
import { MAX_IMPORT_ROWS } from "@/lib/import/columns";
import type { GradeOption, ImportRow } from "@/lib/import/normalize";
import { importRowSchema } from "@/lib/validation";
import {
  parseImportFileAction,
  buildRowsFromTableAction,
  commitImportAction,
  type CommitResult,
} from "@/actions/import";
import { cn } from "@/lib/utils";

const ACCEPT = ".xlsx,.xlsm,.csv,.tsv,.txt,.docx,.pdf,image/*";

/** الصيغ التي يقرؤها المتصفّح بنفسه بدل رفعها إلى الخادم. */
function isBrowserRead(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(pdf|png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name) ||
    file.type === "application/pdf"
  );
}

type Stage =
  | { name: "pick" }
  | { name: "reading"; message: string; ratio: number }
  | { name: "review" }
  | { name: "done"; result: CommitResult };

export function ImportWizard({
  grades,
  academicYear,
}: {
  grades: GradeOption[];
  academicYear: string;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [gradeId, setGradeId] = React.useState(grades[0]?.id ?? "");
  const [stage, setStage] = React.useState<Stage>({ name: "pick" });
  const [rows, setRows] = React.useState<ImportRow[]>([]);
  const [excluded, setExcluded] = React.useState<Set<string>>(new Set());
  const [source, setSource] = React.useState("");
  const [notices, setNotices] = React.useState<string[]>([]);
  const [allowDuplicates, setAllowDuplicates] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);

  /** خطأ يمنع حفظ الصف — يُحسب بنفس المخطّط الذي يستعمله الخادم. */
  const errors = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      const parsed = importRowSchema.safeParse({
        ...row,
        phones: row.phones.filter((p) => p.number.trim()),
      });
      if (!parsed.success) map.set(row.key, parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
    }
    return map;
  }, [rows]);

  const selected = rows.filter((r) => !excluded.has(r.key) && !errors.has(r.key));
  const duplicateCount = rows.filter((r) =>
    r.warnings.some((w) => w.startsWith("مسجّل بالفعل"))
  ).length;

  function reset() {
    setRows([]);
    setExcluded(new Set());
    setSource("");
    setNotices([]);
    setAllowDuplicates(false);
    setStage({ name: "pick" });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file: File) {
    if (!gradeId) {
      toast.error("اختر الصف أولًا");
      return;
    }
    setNotices([]);
    setStage({ name: "reading", message: "قراءة الملف…", ratio: 0.05 });

    try {
      const result = isBrowserRead(file)
        ? await readInBrowser(file)
        : await readOnServer(file);

      if (result.status === "error") {
        toast.error(result.message);
        setStage({ name: "pick" });
        return;
      }

      setRows(result.rows);
      setExcluded(new Set());
      setSource(result.source);

      const messages: string[] = [];
      if (result.truncated) {
        messages.push(`الملف أطول من ${MAX_IMPORT_ROWS} سطرًا — قُرئ أول ${MAX_IMPORT_ROWS} فقط.`);
      }
      if (result.ignoredHeaders.length > 0) {
        messages.push(`أعمدة لم تُفهم فأُهملت: ${result.ignoredHeaders.join("، ")}`);
      }
      setNotices(messages);
      setStage({ name: "review" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّرت قراءة الملف");
      setStage({ name: "pick" });
    }
  }

  async function readOnServer(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("gradeId", gradeId);
    return parseImportFileAction(formData);
  }

  /**
   * ملفات PDF والصور تُقرأ على جهاز المستخدم: لا تُرفع فلا تصطدم بحدود
   * الحجم، ولا تغادر صورة الكشف جهازه. ثم يُرسَل النص وحده ليُفهم ويُتحقق منه.
   */
  async function readInBrowser(file: File) {
    const { readFileInBrowser } = await import("@/lib/import/client-read");
    const { table, source: readSource, usedOcr } = await readFileInBrowser(file, (p) =>
      setStage({ name: "reading", message: p.message, ratio: p.ratio })
    );
    if (usedOcr) {
      toast.info("قُرئ الملف ضوئيًا — راجع كل سطر قبل الحفظ", { duration: 6000 });
    }
    setStage({ name: "reading", message: "مطابقة الأعمدة…", ratio: 0.99 });
    return buildRowsFromTableAction(table, gradeId, readSource);
  }

  async function save() {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      const result = await commitImportAction({
        allowDuplicates,
        rows: selected.map((row) => ({
          key: row.key,
          fullName: row.fullName,
          gradeId: row.gradeId,
          gender: row.gender,
          birthDate: row.birthDate,
          school: row.school,
          confessionFather: row.confessionFather,
          address: row.address,
          notes: row.notes,
          phones: row.phones.filter((p) => p.number.trim()),
        })),
      });
      setStage({ name: "done", result });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حفظ الكشف");
    } finally {
      setSaving(false);
    }
  }

  /* ————————————————————————— الخطوة الأخيرة ————————————————————————— */

  if (stage.name === "done") {
    const { created, skipped } = stage.result;
    return (
      <Card className="animate-fade-in-up">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <CheckCircle2 className="size-12 text-success" aria-hidden />
          <div>
            <h2 className="text-xl font-extrabold text-ink">
              {created > 0 ? `أُضيف ${created} مخدومًا` : "لم يُضَف أحد"}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">السنة الدراسية {academicYear}</p>
          </div>

          {skipped.length > 0 && (
            <div className="w-full max-w-lg rounded-[var(--radius-md)] bg-warning-soft p-4 text-start">
              <p className="mb-2 text-sm font-bold text-warning">
                تُخطّي {skipped.length} اسمًا لأنها مسجّلة بالفعل:
              </p>
              <ul className="space-y-1 text-sm text-ink-muted">
                {skipped.map((s, i) => (
                  <li key={i}>• {s.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reset}>
              <Upload className="size-4" aria-hidden />
              استيراد كشف آخر
            </Button>
            <Button variant="outline" onClick={() => router.push("/hierarchy")}>
              الذهاب إلى المراحل والصفوف
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ————————————————————————— المراجعة ————————————————————————— */

  if (stage.name === "review") {
    return (
      <div className="space-y-4 pb-40 lg:pb-24">
        <Card className="animate-fade-in-up">
          <CardHeader className="flex-wrap">
            <div className="min-w-0">
              <CardTitle>راجع قبل الحفظ</CardTitle>
              <p className="mt-1 text-sm text-ink-muted">
                قُرئ من: {source} — عدّل أي سطر بالضغط عليه، أو أزل ما لا تريده.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{selected.length} للحفظ</Badge>
              {errors.size > 0 && <Badge tone="error">{errors.size} بها خطأ</Badge>}
              {duplicateCount > 0 && <Badge tone="warning">{duplicateCount} مكرّر</Badge>}
            </div>
          </CardHeader>

          {notices.length > 0 && (
            <CardContent className="pt-0">
              <ul className="space-y-1 rounded-[var(--radius-md)] bg-warning-soft p-3 text-sm text-ink-muted">
                {notices.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                    {n}
                  </li>
                ))}
              </ul>
            </CardContent>
          )}

          <CardContent className="flex flex-wrap items-center gap-2 pt-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExcluded(new Set())}
              disabled={excluded.size === 0}
            >
              تحديد الكل
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExcluded(new Set(rows.map((r) => r.key)))}
              disabled={excluded.size === rows.length}
            >
              إلغاء التحديد
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              اختيار ملف آخر
            </Button>
          </CardContent>
        </Card>

        <ul className="space-y-2">
          {rows.map((row, index) => (
            <ImportReviewRow
              key={row.key}
              row={row}
              index={index}
              grades={grades}
              selected={!excluded.has(row.key) && !errors.has(row.key)}
              error={errors.get(row.key) ?? null}
              onToggle={(checked) =>
                setExcluded((prev) => {
                  const next = new Set(prev);
                  if (checked) next.delete(row.key);
                  else next.add(row.key);
                  return next;
                })
              }
              onChange={(next) =>
                setRows((prev) => prev.map((r) => (r.key === row.key ? next : r)))
              }
              onRemove={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
            />
          ))}
        </ul>

        {/* شريط الحفظ يعلو قائمة التنقّل السفلية على الهاتف، ويبدأ بعد
            القائمة الجانبية على الشاشات الكبيرة. */}
        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] start-0 end-0 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur lg:bottom-0 lg:start-64">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            {duplicateCount > 0 ? (
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-primary)]"
                  checked={allowDuplicates}
                  onChange={(e) => setAllowDuplicates(e.target.checked)}
                />
                أضف الأسماء المكرّرة أيضًا
              </label>
            ) : (
              <span className="text-sm text-ink-muted">السنة الدراسية {academicYear}</span>
            )}
            <Button onClick={save} loading={saving} disabled={selected.length === 0}>
              حفظ {selected.length} مخدومًا
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ————————————————————————— الاختيار والقراءة ————————————————————————— */

  const reading = stage.name === "reading";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle>ارفع الكشف</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="import-grade" required>
              الصف
            </Label>
            <Select
              id="import-grade"
              value={gradeId}
              disabled={reading}
              onChange={(e) => setGradeId(e.target.value)}
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </Select>
            <FieldHint>
              يُسجَّل فيه كل من لم يذكر الملف صفَّه. تقدر تغيّر صف أي سطر عند المراجعة.
            </FieldHint>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file && !reading) void handleFile(file);
            }}
            className={cn(
              "rounded-[var(--radius-md)] border-2 border-dashed p-8 text-center transition-colors",
              dragging ? "border-primary bg-primary-soft/40" : "border-border-strong bg-bg-alt/40"
            )}
          >
            {reading ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-ink">{stage.message}</p>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-border"
                  role="progressbar"
                  aria-valuenow={Math.round(stage.ratio * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="تقدّم قراءة الملف"
                >
                  <div
                    className="h-full bg-primary transition-[width] duration-300"
                    style={{ width: `${Math.max(3, Math.round(stage.ratio * 100))}%` }}
                  />
                </div>
                <p className="text-xs text-ink-faint">
                  القراءة تتم على جهازك — لا تغلق الصفحة.
                </p>
              </div>
            ) : (
              <>
                <Upload className="mx-auto size-8 text-ink-faint" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-ink">
                  اسحب الملف هنا أو اختره من جهازك
                </p>
                <p className="mt-1 text-xs text-ink-faint">
                  Excel أو Word أو CSV أو PDF أو صورة
                </p>
                <Button className="mt-4" onClick={() => inputRef.current?.click()}>
                  اختيار ملف
                </Button>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </div>

          <a
            href="/api/import/template"
            className="flex items-center gap-3 rounded-[var(--radius-md)] border border-primary/30 bg-primary-soft/40 p-4 transition-colors hover:bg-primary-soft"
          >
            <Download className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-ink">نزّل القالب الجاهز</span>
              <span className="block text-xs text-ink-muted">
                ملف Excel بأعمدة مضبوطة وقوائم منسدلة بصفوفك — أدق طريقة وأسرعها
              </span>
            </span>
          </a>
        </CardContent>
      </Card>

      <Card className="animate-fade-in-up lg:sticky lg:top-4 lg:self-start">
        <CardHeader>
          <CardTitle>الصيغ المقبولة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Method
            icon={FileSpreadsheet}
            tone="success"
            title="Excel أو CSV"
            accuracy="دقة كاملة"
            note="القالب أو أي ملف بعناوين أعمدة مفهومة."
          />
          <Method
            icon={FileText}
            tone="success"
            title="Word أو PDF مكتوب"
            accuracy="دقة عالية"
            note="يُقرأ الجدول من داخل الملف كما هو."
          />
          <Method
            icon={ScanLine}
            tone="warning"
            title="كشف مصوَّر أو ممسوح"
            accuracy="تقريبية"
            note="يُقرأ ضوئيًا على جهازك. راجع كل سطر — الخط اليدوي خاصة."
          />
          <p className="border-t border-border pt-4 text-xs text-ink-faint">
            لا يُحفظ شيء إلا بعد أن تراجعه وتضغط حفظ. والاستيراد محصور في صفوفك.{" "}
            <Link href="/hierarchy" className="font-semibold text-primary hover:underline">
              المراحل والصفوف
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Method({
  icon: Icon,
  tone,
  title,
  accuracy,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "warning";
  title: string;
  accuracy: string;
  note: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon
        className={cn("mt-0.5 size-5 shrink-0", tone === "success" ? "text-success" : "text-warning")}
      />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
          {title}
          <Badge tone={tone}>{accuracy}</Badge>
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">{note}</p>
      </div>
    </div>
  );
}
