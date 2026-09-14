/**
 * إعادة بناء جدول من عناصر نصية موضعية.
 *
 * مصدر العناصر إمّا طبقة النص في ملف PDF أو كلمات ناتجة عن القراءة الضوئية
 * (OCR)؛ كلاهما يعطي نصًا مع إحداثيات، ولا يعطي «جدولًا». تُستعاد البنية على
 * أربع خطوات: سطور من العناصر المتقاربة رأسيًا، ثم خلايا من الفجوات داخل كل
 * سطر، ثم أعمدة من مواضع خلايا صف العناوين، ثم سجلات بدمج السطور التي تخصّ
 * مخدومًا واحدًا (فالكشوف الحقيقية تفرد العنوان والتليفونات على عدة سطور).
 */

export type LayoutItem = {
  text: string;
  /** إحداثيات صندوق العنصر: المحور y يكبر للأسفل. */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TableOptions = {
  /** اتجاه القراءة؛ الكشوف عربية فالافتراضي من اليمين. */
  rtl?: boolean;
  /** هل نص الخلية عنوان عمود معروف؟ يحدّد صف العناوين ومواضع الأعمدة. */
  isHeaderCell?: (text: string) => boolean;
  /** هل هو عنوان عمود الاسم؟ يُستعمل مرساةً لدمج سطور السجل الواحد. */
  isAnchorHeader?: (text: string) => boolean;
};

type Cell = { text: string; x0: number; x1: number };
type Line = { y: number; cells: Cell[] };
type Range = { x0: number; x1: number };

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
    // بعض مولّدات PDF تقطع الكلمة الواحدة إلى عنصرين متلاصقين («العب» + «د»)،
    // فلا تُفصل بمسافة إلا إن كان بينهما فراغ حقيقي. والفرق بيّن بالقياس:
    // القطع داخل الكلمة فراغه صفر، والمسافة بين كلمتين عُشر ارتفاع السطر
    // تقريبًا، والفاصل بين عمودين أضعاف ذلك.
    let text = "";
    for (const [i, item] of current.entries()) {
      const previous = current[i - 1];
      if (previous) {
        const gap = rtl
          ? previous.x - (item.x + item.width)
          : item.x - (previous.x + previous.width);
        if (gap > lineHeight * 0.12) text += " ";
      }
      text += item.text.trim();
    }
    text = text.replace(/\s+/g, " ").trim();
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

const center = (cell: Cell | Range) => (cell.x0 + cell.x1) / 2;

/**
 * أعمدة مأخوذة من صف العناوين نفسه: الحدّ بين عمودين هو منتصف المسافة بين
 * مركزي عنوانيهما. هذه أدقّ طريقة، لأنها تقرأ الجدول كما يقرؤه الإنسان.
 */
function rangesFromHeader(header: Cell[]): Range[] {
  const sorted = [...header].sort((a, b) => a.x0 - b.x0);
  return sorted.map((cell, i) => ({
    x0: i === 0 ? -Infinity : (center(sorted[i - 1]) + center(cell)) / 2,
    x1: i === sorted.length - 1 ? Infinity : (center(cell) + center(sorted[i + 1])) / 2,
  }));
}

/**
 * أعمدة مستنبطة من المساحات الرأسية الفارغة — تُستعمل حين لا يُعثر على صف
 * عناوين. تُستثنى الخلايا العريضة (عنوان الصفحة مثلًا) وسطور الخلية الواحدة،
 * لأن خلية تمتد عرض الصفحة تجسر كل الفواصل فتُلغي الأعمدة كلها.
 */
function rangesFromGutters(lines: Line[], lineHeight: number): Range[] {
  const all = lines.flatMap((l) => l.cells);
  if (all.length === 0) return [];

  const pageWidth = Math.max(...all.map((c) => c.x1)) - Math.min(...all.map((c) => c.x0));
  const widthLimit = Math.min(pageWidth * 0.4, median(all.map((c) => c.x1 - c.x0)) * 3);
  const narrow = lines
    .filter((line) => line.cells.length > 1)
    .flatMap((l) => l.cells)
    .filter((cell) => cell.x1 - cell.x0 <= widthLimit);

  const sorted = [...(narrow.length > 0 ? narrow : all)].sort((a, b) => a.x0 - b.x0);
  const ranges: Range[] = [];
  for (const cell of sorted) {
    const last = ranges[ranges.length - 1];
    // فجوة أضيق من نصف ارتفاع السطر ليست فاصل عمود بل تفاوت محاذاة.
    if (last && cell.x0 - last.x1 < lineHeight * 0.5) last.x1 = Math.max(last.x1, cell.x1);
    else ranges.push({ x0: cell.x0, x1: cell.x1 });
  }
  return ranges;
}

/** أفضل سطر يصلح صفَّ عناوين: أكثرها تطابقًا مع الأعمدة المعروفة. */
function findHeaderLine(lines: Line[], isHeaderCell: (text: string) => boolean) {
  let best = { index: -1, matched: 0 };
  for (const [index, line] of lines.entries()) {
    const matched = line.cells.filter((c) => isHeaderCell(c.text)).length;
    if (matched > best.matched) best = { index, matched };
  }
  // ثلاثة عناوين متطابقة في سطر واحد لا تجتمع مصادفةً.
  return best.matched >= 3 ? best.index : -1;
}

function assignToColumn(cell: Cell, ranges: Range[]) {
  const middle = center(cell);
  const inside = ranges.findIndex((r) => middle >= r.x0 && middle <= r.x1);
  if (inside >= 0) return inside;

  let best = 0;
  let bestDistance = Infinity;
  ranges.forEach((range, i) => {
    const distance = middle < range.x0 ? range.x0 - middle : middle - range.x1;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}

/**
 * يدمج سطور السجل الواحد. في الكشوف الحقيقية يشغل المخدوم عدة سطور: العنوان
 * يلتفّ، وتليفونات الأب والأم والبيت تتراصّ تحت بعضها، ورقمه المسلسل يتوسّط
 * الخانة. فيُتّخذ سطر الاسم مرساةً، ويُضمّ إليه كل سطر هو أقرب ما يكون إليه.
 */
function mergeIntoRecords(
  rows: { y: number; cells: string[] }[],
  anchorColumn: number
): string[][] {
  const anchors = rows.filter((row) => row.cells[anchorColumn]?.trim());
  if (anchors.length === 0) return rows.map((r) => r.cells);

  const groups = anchors.map(() => [] as { y: number; cells: string[] }[]);
  for (const row of rows) {
    let nearest = 0;
    let bestDistance = Infinity;
    anchors.forEach((anchor, i) => {
      const distance = Math.abs(anchor.y - row.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = i;
      }
    });
    groups[nearest].push(row);
  }

  return groups.map((group) => {
    const merged: string[] = [];
    for (const row of group.sort((a, b) => a.y - b.y)) {
      row.cells.forEach((cell, i) => {
        if (!cell.trim()) return;
        merged[i] = merged[i] ? `${merged[i]} ${cell}` : cell;
      });
    }
    return merged.map((cell) => cell ?? "");
  });
}

/**
 * يحوّل عناصر صفحة إلى جدول. الترتيب من اليمين إلى اليسار لأن الكشوف عربية:
 * أول عمود في الناتج هو أقصى اليمين في الصفحة.
 */
export function itemsToTable(items: LayoutItem[], options: TableOptions = {}): string[][] {
  const { rtl = true, isHeaderCell, isAnchorHeader } = options;

  const usable = items.filter((i) => i.text.trim().length > 0);
  if (usable.length === 0) return [];

  const lineHeight = median(usable.map((i) => i.height)) || 10;
  const lines: Line[] = groupIntoLines(usable, lineHeight)
    .map((line) => ({
      y: median(line.map((i) => i.y + i.height / 2)),
      cells: splitLineIntoCells(line, lineHeight, rtl),
    }))
    .filter((line) => line.cells.length > 0);

  const headerIndex = isHeaderCell ? findHeaderLine(lines, isHeaderCell) : -1;
  const ranges =
    headerIndex >= 0
      ? rangesFromHeader(lines[headerIndex].cells)
      : rangesFromGutters(lines, lineHeight);
  if (ranges.length === 0) return [];

  // ما فوق صف العناوين ترويسة صفحة (آية، اسم الكنيسة) لا بيانات.
  const body = headerIndex >= 0 ? lines.slice(headerIndex) : lines;

  const rows = body.map((line) => {
    const cells: string[] = new Array(ranges.length).fill("");
    for (const cell of line.cells) {
      const index = assignToColumn(cell, ranges);
      cells[index] = cells[index] ? `${cells[index]} ${cell.text}` : cell.text;
    }
    return { y: line.y, cells: rtl ? cells.reverse() : cells };
  });

  if (headerIndex < 0 || !isAnchorHeader) return rows.map((r) => r.cells).filter((r) => r.some(Boolean));

  const anchorColumn = rows[0].cells.findIndex((text) => isAnchorHeader(text));
  if (anchorColumn < 0) return rows.map((r) => r.cells).filter((r) => r.some(Boolean));

  const [header, ...rest] = rows;
  return [header.cells, ...mergeIntoRecords(rest, anchorColumn)].filter((r) => r.some(Boolean));
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
