"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { AttendanceTrend, TrendPoint } from "@/lib/attendance-stats";
import { cn } from "@/lib/utils";

/**
 * منحنى نسبة الحضور عبر أيام الاجتماعات.
 *
 * سلسلةٌ واحدة تقيس شيئًا واحدًا، فلونٌ واحد ولا حاجة لمفتاح ألوان: العنوان
 * يسمّيها. والمحور من صفر إلى مئة دائمًا — محورٌ مقصوص يضخّم فرقًا لا وجود له.
 *
 * والزمن يسير من اليمين إلى اليسار كما يُقرأ النص: الأقدم عند حافة النِّسَب،
 * والأحدث في المقدّمة وعليه نبضة، وتاريخ كل طرف مكتوب تحته فلا يلتبس الاتجاه.
 *
 * ما لم يُسجَّل ليس نقطةً بصفر — هو ليس نقطة أصلًا. ويومٌ فُتحت فيه كشوف عدة
 * صفوف هو نقطةٌ واحدة تجمع سجلاتها: الرسم يقيس الخدمة في ذلك اليوم.
 */

const HEIGHT = 190;
const PAD = { top: 30, right: 36, bottom: 26, left: 14 };

export function AttendanceTrendChart({ trend }: { trend: AttendanceTrend }) {
  const { points } = trend;
  const wrap = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  const [active, setActive] = React.useState<number | null>(null);

  React.useEffect(() => {
    const element = wrap.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const latest = points.length > 0 ? points[points.length - 1]! : null;
  const headline = useCountUp(latest?.rate ?? 0);

  const plotW = Math.max(width - PAD.left - PAD.right, 10);
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  // الزمن من اليمين إلى اليسار: الفهرس صفر هو الأقدم وموضعه أقصى اليمين.
  const xOf = (index: number) =>
    points.length === 1
      ? PAD.left + plotW / 2
      : width - PAD.right - (index * plotW) / (points.length - 1);
  const yOf = (rate: number) => PAD.top + (1 - rate / 100) * plotH;

  const coords = points.map((p, i) => ({ x: xOf(i), y: yOf(p.rate) }));
  const line = smoothPath(coords);
  const area =
    coords.length > 1
      ? `${line} L ${coords[coords.length - 1]!.x.toFixed(1)} ${(HEIGHT - PAD.bottom).toFixed(1)} ` +
        `L ${coords[0]!.x.toFixed(1)} ${(HEIGHT - PAD.bottom).toFixed(1)} Z`
      : "";

  function track(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let nearest = 0;
    for (let i = 1; i < coords.length; i++) {
      if (Math.abs(coords[i]!.x - x) < Math.abs(coords[nearest]!.x - x)) nearest = i;
    }
    setActive(nearest);
  }

  if (points.length === 0) return null;

  const shown = active !== null ? points[active]! : null;
  const shownAt = active !== null ? coords[active]! : null;
  const dateLabels = placeLabels(points, coords, width);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-ink-faint">آخر اجتماع — {latest!.label}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tabular-nums text-ink">{headline}٪</span>
            <DeltaBadge delta={trend.delta} />
          </p>
        </div>
        <dl className="flex gap-4 text-xs">
          <Figure label="المتوسط" value={`${trend.average}٪`} />
          {trend.best && <Figure label="أعلى نسبة" value={`${trend.best.rate}٪`} hint={trend.best.label} />}
          <Figure label="اجتماعات" value={String(points.length)} />
        </dl>
      </div>

      <div ref={wrap} className="relative">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            role="img"
            aria-label={summarize(trend)}
            className="block touch-pan-y select-none"
            onPointerMove={track}
            onPointerDown={track}
            onPointerLeave={() => setActive(null)}
            onPointerCancel={() => setActive(null)}
          >
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* شبكةٌ خافتة: مرجعٌ للقراءة لا عنصرٌ يُرى قبل البيانات. */}
            {[0, 50, 100].map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={yOf(tick)}
                  y2={yOf(tick)}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? undefined : "3 5"}
                />
                <text
                  x={width - PAD.right + 6}
                  y={yOf(tick) + 4}
                  className="fill-ink-faint text-[0.63rem] tabular-nums"
                >
                  {tick}٪
                </text>
              </g>
            ))}

            {area && <path d={area} fill="url(#trend-fill)" className="animate-chart-rise" />}

            <path
              d={line}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              className="animate-chart-draw"
            />

            {/* خطّ المؤشّر: يربط النقطة بالتاريخ تحتها وقت اللمس أو المرور. */}
            {shownAt && (
              <line
                x1={shownAt.x}
                x2={shownAt.x}
                y1={PAD.top - 8}
                y2={HEIGHT - PAD.bottom}
                stroke="var(--color-primary)"
                strokeWidth="1"
                strokeDasharray="3 4"
                opacity="0.7"
              />
            )}

            {coords.map((point, i) => {
              const newest = i === points.length - 1;
              const on = active === i;
              return (
                <g key={points[i]!.date}>
                  {newest && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="5"
                      fill="var(--color-primary)"
                      className="animate-chart-ping"
                    />
                  )}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={on ? 6 : newest ? 5 : 3.5}
                    fill={on || newest ? "var(--color-primary)" : "var(--color-surface)"}
                    stroke="var(--color-primary)"
                    strokeWidth="2"
                    className="animate-chart-pop transition-[r]"
                    style={{ animationDelay: `${450 + i * 55}ms` }}
                  />
                </g>
              );
            })}

            {/* علامةٌ مباشرة على آخر نقطة فقط — رقمٌ فوق كل نقطة يُعمي الرسم. */}
            <text
              x={insideX(coords[coords.length - 1]!.x, `${latest!.rate}٪`, width)}
              y={coords[coords.length - 1]!.y - 12}
              textAnchor="middle"
              className="fill-ink text-[0.72rem] font-extrabold tabular-nums"
            >
              {latest!.rate}٪
            </text>

            {dateLabels.map((label) => (
              <text
                key={label.key}
                x={label.x}
                y={HEIGHT - 8}
                textAnchor="middle"
                className={cn(
                  "text-[0.63rem]",
                  active === label.index ? "fill-primary-ink font-bold" : "fill-ink-faint"
                )}
              >
                {label.text}
              </text>
            ))}
          </svg>
        )}

        {shown && shownAt && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-44 -translate-x-1/2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-xs shadow-[var(--shadow-md)] animate-scale-in"
            style={{
              left: Math.min(Math.max(shownAt.x, 74), Math.max(width - 74, 74)),
              top: Math.max(shownAt.y - 76, 0),
            }}
          >
            <p className="font-bold text-ink">{shown.label}</p>
            <p className="mt-0.5 text-lg font-extrabold tabular-nums text-primary-ink">{shown.rate}٪</p>
            <p className="text-ink-muted tabular-nums">
              {shown.present} حضور من {shown.records} سجلًا
            </p>
            <p className="text-ink-faint tabular-nums">{shown.grades} صفًا مسجَّلًا</p>
          </div>
        )}
      </div>

      {/* البديل النصّي: الأرقام نفسها لمن لا يرى الرسم. */}
      <table className="sr-only">
        <caption>نسبة الحضور في كل اجتماع</caption>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>النسبة</th>
            <th>الحضور</th>
            <th>السجلات</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <td>{point.label}</td>
              <td>{point.rate}٪</td>
              <td>{point.present}</td>
              <td>{point.records}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * تاريخُ أقصى اليسار كان نصفه خارج الرسم لأنه مركَّزٌ على نقطةٍ عند الحافة،
 * فيُزاح إلى الداخل بقدر نصف عرضه المقدَّر. تقديرٌ لا قياس، لأن قياس النص
 * يحتاج رسمه أولًا، والإزاحة بضعة بكسلات لا تُخطئ بها العين.
 */
function insideX(x: number, text: string, width: number) {
  const half = text.length * 3.2 + 4;
  return clamp(x, half + 2, width - half - 2);
}

/** التواريخ تتزاحم إن كُتبت كلها، فتُكتب أطرافُها وما بينها بالتناوب. */
function showLabel(index: number, total: number) {
  if (total <= 5) return true;
  const step = Math.ceil(total / 4);
  return index === 0 || index === total - 1 || index % step === 0;
}

/**
 * ثم يُسقَط ما تبقّى متراكبًا. التباعد المنتظم لا يكفي: تاريخُ الطرف مزاحٌ إلى
 * الداخل، وطول التواريخ مختلف، فتلتقي كلمتان في مكان واحد. وتاريخٌ فوق تاريخ
 * لا يُقرأ منه شيء، فالأَولى أن يُكتب أحدهما.
 */
function placeLabels(points: TrendPoint[], coords: { x: number }[], width: number) {
  const kept: { key: string; index: number; text: string; x: number; half: number }[] = [];
  const candidates = points
    .map((point, index) => ({
      key: point.date,
      index,
      text: point.label,
      x: insideX(coords[index]!.x, point.label, width),
      half: point.label.length * 3.2 + 4,
    }))
    .filter((candidate) => showLabel(candidate.index, points.length))
    .sort((a, b) => a.x - b.x);

  for (const candidate of candidates) {
    const last = kept[kept.length - 1];
    if (!last || candidate.x - candidate.half > last.x + last.half + 6) kept.push(candidate);
  }
  return kept;
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-ink-faint">{label}</dt>
      <dd className="font-extrabold tabular-nums text-ink">
        {value}
        {hint && <span className="ms-1 font-normal text-ink-faint">({hint})</span>}
      </dd>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const tone =
    delta > 0
      ? "bg-success-soft text-success"
      : delta < 0
        ? "bg-error-soft text-error"
        : "bg-bg-alt text-ink-muted";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
        tone
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {delta > 0 ? "+" : ""}
      {delta}٪
      <span className="sr-only">مقارنةً بالاجتماع السابق</span>
    </span>
  );
}

/** عدٌّ تصاعدي حتى الرقم — يلفت النظر إلى أن الرقم محسوب لا مكتوب. */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    // لمن يطلب تقليل الحركة: قفزةٌ واحدة إلى الرقم في الإطار التالي، لا عدّ.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = reduce ? 1 : Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

const clamp = (value: number, a: number, b: number) =>
  Math.min(Math.max(value, Math.min(a, b)), Math.max(a, b));

/**
 * منحنى ناعم يمرّ بكل نقطة. وأطراف المنحنيات محصورةٌ بين قيمتي النقطتين، فلا
 * يرتفع الخطّ فوق نسبةٍ لم تُسجَّل ولا ينزل تحت أخرى.
 */
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)} h 0.01`;

  let d = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = clamp(p1.y + (p2.y - p0.y) * t, p1.y, p2.y);
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = clamp(p2.y - (p3.y - p1.y) * t, p1.y, p2.y);
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function summarize({ points, average, delta }: AttendanceTrend) {
  const last = points[points.length - 1] as TrendPoint | undefined;
  if (!last) return "لا توجد بيانات حضور";
  const change =
    delta === null
      ? ""
      : delta === 0
        ? "، بلا تغيّر عن الاجتماع السابق"
        : `، ${delta > 0 ? "بزيادة" : "بنقص"} ${Math.abs(delta)} بالمئة عن الاجتماع السابق`;
  return (
    `نسبة الحضور في آخر ${points.length} اجتماعًا. آخرها ${last.label}: ` +
    `${last.rate} بالمئة${change}. المتوسط ${average} بالمئة.`
  );
}
