/**
 * إعادة بناء جدول من عناصر نصية موضعية.
 *
 * مصدر العناصر إمّا طبقة النص في ملف PDF أو كلمات ناتجة عن القراءة الضوئية
 * (OCR)؛ كلاهما يعطي نصًا مع إحداثيات، وكلاهما لا يعطي «جدولًا». هنا نستعيد
 * الصفوف بتجميع العناصر المتقاربة رأسيًا، ثم الخلايا بالفجوات داخل كل سطر،
 * ثم الأعمدة بالمساحات الرأسية الفارغة عبر الصفحة.
 */

export type LayoutItem = {
  text: string;
  /** إحداثيات صندوق العنصر: المحور y يكبر للأسفل. */
  x: number;
  y: number;
  width: number;
  height: number;
};

type Cell = { text: string; x0: number; x1: number };

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** يجمع العناصر المتقاربة رأسيًا في سطور. */
function groupIntoLines(items: LayoutItem[], lineHeight: number): LayoutItem[][] {
  const byY = [...items].sort((a, b) => a.y - b.y);
  const lines: LayoutItem[][] = [];
  let current: LayoutItem[] = [];
  let currentY = Number.NaN;

  for (const item of byY) {
    const center = item.y + item.height / 2;
    if (current.length === 0 || Math.abs(center - currentY) <= lineHeight * 0.6) {
      current.push(item);
      currentY = Number.isNaN(currentY)
        ? center
        : (currentY * (current.length - 1) + center) / current.length;
    } else {
      lines.push(current);
      current = [item];
      currentY = center;
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

/**
 * يقسم سطرًا إلى خلايا. المسافة بين كلمتين في خلية واحدة أضيق من ارتفاع
 * السطر بكثير، بينما الفاصل بين عمودين أوسع منه — وهذا هو الحدّ الفاصل.
 */
function splitLineIntoCells(line: LayoutItem[], lineHeight: number, rtl: boolean): Cell[] {
  const sorted = [...line].sort((a, b) => (rtl ? b.x + b.width - (a.x + a.width) : a.x - b.x));
  const cells: Cell[] = [];
  let current: LayoutItem[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const text = current
      .map((i) => i.text.trim())
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) {
      cells.push({
        text,
        x0: Math.min(...current.map((i) => i.x)),
        x1: Math.max(...current.map((i) => i.x + i.width)),
      });
    }
    current = [];
  };

  for (const item of sorted) {
    const previous = current[current.length - 1];
    if (previous) {
      const gap = rtl
        ? previous.x - (item.x + item.width)
        : item.x - (previous.x + previous.width);
      if (gap > lineHeight * 0.9) flush();
    }
    current.push(item);
  }
  flush();
  return cells;
}

/**
 * أعمدة الصفحة هي المديات الأفقية التي تشغلها خلايا الجدول، والفواصل بينها
 * هي المساحات الرأسية الفارغة عبر الصفحة كلها — فلا حاجة لتخمين عددها.
 *
 * تُستثنى من الحساب الخلايا العريضة (عنوان الكشف مثلًا) وسطور الخلية
 * الواحدة، لأن خلية تمتد عرض الصفحة تجسر كل الفواصل فتُلغي الأعمدة كلها.
 */
function columnRanges(cellLines: Cell[][], lineHeight: number) {
  const all = cellLines.flat();
  if (all.length === 0) return [];

  const pageWidth = Math.max(...all.map((c) => c.x1)) - Math.min(...all.map((c) => c.x0));
  const tableCells = cellLines
    .filter((line) => line.length > 1)
    .flat()
    .filter((cell) => cell.x1 - cell.x0 <= pageWidth * 0.4);

  const sorted = [...(tableCells.length > 0 ? tableCells : all)].sort((a, b) => a.x0 - b.x0);
  const ranges: { x0: number; x1: number }[] = [];

  for (const cell of sorted) {
    const last = ranges[ranges.length - 1];
    // فجوة أضيق من نصف ارتفاع السطر ليست فاصل عمود بل تفاوت محاذاة.
    if (last && cell.x0 - last.x1 < lineHeight * 0.5) {
      last.x1 = Math.max(last.x1, cell.x1);
    } else {
      ranges.push({ x0: cell.x0, x1: cell.x1 });
    }
  }
  return ranges;
}

/**
 * يحوّل عناصر صفحة واحدة إلى جدول. الترتيب من اليمين إلى اليسار لأن الكشوف
 * عربية: أول عمود في الناتج هو أقصى اليمين في الصفحة.
 */
export function itemsToTable(items: LayoutItem[], rtl = true): string[][] {
  const usable = items.filter((i) => i.text.trim().length > 0);
  if (usable.length === 0) return [];

  const lineHeight = median(usable.map((i) => i.height)) || 10;

  // الأعمدة تُستنبط من الخلايا لا من الكلمات المفردة، وإلا صارت كل كلمة في
  // «مينا عادل فهيم» عمودًا مستقلًا.
  const cellLines = groupIntoLines(usable, lineHeight).map((line) =>
    splitLineIntoCells(line, lineHeight, rtl)
  );
  const ranges = columnRanges(cellLines, lineHeight);
  if (ranges.length === 0) return [];

  const columnOf = (cell: Cell) => {
    const center = (cell.x0 + cell.x1) / 2;
    const inside = ranges.findIndex((r) => center >= r.x0 && center <= r.x1);
    if (inside >= 0) return inside;

    // خلية خرجت عن حدود عمودها: تُنسب إلى أقربها.
    let best = 0;
    let bestDistance = Infinity;
    ranges.forEach((range, i) => {
      const distance = center < range.x0 ? range.x0 - center : center - range.x1;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  };

  const table: string[][] = [];
  for (const cells of cellLines) {
    const row: string[] = new Array(ranges.length).fill("");
    for (const cell of cells) {
      const index = columnOf(cell);
      row[index] = row[index] ? `${row[index]} ${cell.text}` : cell.text;
    }
    if (row.some((c) => c)) table.push(rtl ? row.reverse() : row);
  }

  return table;
}

/**
 * ملاذٌ أخير حين لا يكون في الصفحة جدول: كل سطر مخدوم، ويُستخلَص منه
 * التاريخ والأرقام بالتعبيرات النمطية ويبقى الباقي اسمًا. النتيجة تُعرض
 * للمراجعة قبل الحفظ — فهي اقتراح لا حقيقة.
 */
export function linesToTable(text: string): string[][] {
  const table: string[][] = [["الاسم", "تاريخ الميلاد", "تليفون ١", "تليفون ٢", "ملاحظات"]];
  const dateRe = /\b(\d{1,4}\s*[/\-.]\s*\d{1,2}\s*[/\-.]\s*\d{1,4})\b/;
  const phoneRe = /(?:\+?\d[\d\s-]{6,16}\d)/g;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line.length < 3) continue;
    if (!/\p{Script=Arabic}/u.test(line)) continue;

    let rest = line;
    const date = rest.match(dateRe)?.[1] ?? "";
    if (date) rest = rest.replace(date, " ");

    const phones: string[] = [];
    for (const match of rest.matchAll(phoneRe)) {
      const digits = match[0].replace(/\D/g, "");
      if (digits.length >= 7 && digits.length <= 15) phones.push(digits);
    }
    for (const phone of phones) rest = rest.replace(phone, " ");

    const name = rest
      .replace(/[^\p{Script=Arabic}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (name.split(" ").length < 2) continue;

    table.push([name, date, phones[0] ?? "", phones[1] ?? "", ""]);
  }

  return table.length > 1 ? table : [];
}
