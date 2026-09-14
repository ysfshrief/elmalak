import "server-only";

/**
 * قراءة ملف الكشف وتحويله إلى جدول خام.
 *
 * تتم القراءة هنا لصيغ المكتب وحدها (Excel و Word و CSV) — وهي صغيرة
 * ومضبوطة البنية. أمّا ملفات PDF والصور فيقرؤها المتصفّح (‎client-read.ts‎)
 * ولا تُرفع إلى الخادم أصلًا: فلا تصطدم بحدّ حجم الطلب ولا بمهلة الدوال بلا
 * خادم، ولا تغادر صورة كشف المخدومين جهاز صاحبها.
 */
import { linesToTable } from "./layout";
import { cleanCell } from "./normalize";

export type ParseResult =
  | { kind: "table"; table: string[][]; source: string }
  | { kind: "error"; message: string };

/**
 * أكبر حجم ملف يُرفع إلى الخادم. ملفات المكتب (Excel و Word) لا تقترب منه،
 * وهو دون حدّ الطلب في بيئات النشر بلا خادم. الملفات الكبيرة (الكشوف
 * الممسوحة) تُقرأ في المتصفّح ولا تُرفع أصلًا.
 */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

const EXT = (name: string) => name.toLowerCase().split(".").pop() ?? "";

export async function parseImportFile(
  buffer: Buffer,
  filename: string
): Promise<ParseResult> {
  if (buffer.byteLength === 0) return { kind: "error", message: "الملف فارغ" };
  if (buffer.byteLength > MAX_FILE_BYTES) {
    return { kind: "error", message: "حجم الملف أكبر من ٤ ميجابايت" };
  }

  const ext = EXT(filename);
  try {
    switch (ext) {
      case "xlsx":
      case "xlsm":
        return await parseXlsx(buffer);
      case "csv":
      case "tsv":
      case "txt":
        return parseDelimited(buffer, ext);
      case "docx":
        return await parseDocx(buffer);
      case "pdf":
        return {
          kind: "error",
          message: "ملفات PDF تُقرأ في المتصفّح — لا ينبغي أن تصل إلى هنا",
        };
      case "xls":
        return {
          kind: "error",
          message: "صيغة xls القديمة غير مدعومة — احفظ الملف بصيغة xlsx ثم أعد رفعه",
        };
      case "doc":
        return {
          kind: "error",
          message: "صيغة doc القديمة غير مدعومة — احفظ الملف بصيغة docx ثم أعد رفعه",
        };
      default:
        return { kind: "error", message: `صيغة غير مدعومة: .${ext}` };
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { kind: "error", message: `تعذّرت قراءة الملف: ${detail}` };
  }
}

/* ————————————————————————— Excel ————————————————————————— */

async function parseXlsx(buffer: Buffer): Promise<ParseResult> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  // Buffer الخاص بـNode متوافق مع ArrayBuffer المطلوب هنا.
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  // ورقة «المخدومون» إن وُجدت (القالب)، وإلا أول ورقة مرئية فيها بيانات.
  const sheets = workbook.worksheets.filter((s) => s.state !== "hidden" && s.state !== "veryHidden");
  const sheet =
    sheets.find((s) => s.name.trim() === "المخدومون") ?? sheets.find((s) => s.rowCount > 1);
  if (!sheet) return { kind: "error", message: "لا توجد ورقة بيانات في الملف" };

  const table: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = excelCellText(cell.value);
    });
    for (let i = 0; i < cells.length; i++) cells[i] ??= "";
    table.push(cells);
  });

  return { kind: "table", table, source: `Excel — ورقة «${sheet.name}»` };
}

type ExcelValue = {
  text?: string;
  result?: unknown;
  richText?: { text: string }[];
  hyperlink?: string;
};

function excelCellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return cleanCell(value);
  if (typeof value === "object") {
    const v = value as ExcelValue;
    if (Array.isArray(v.richText)) return cleanCell(v.richText.map((t) => t.text).join(""));
    if (v.result !== undefined) return excelCellText(v.result);
    if (v.text !== undefined) return cleanCell(v.text);
    return "";
  }
  return cleanCell(value);
}

/* ————————————————————————— CSV / TSV ————————————————————————— */

/** محلّل CSV كامل: يدعم الاقتباس، والاقتباس المزدوج داخله، والأسطر داخل الخلايا. */
export function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => cleanCell(c)));
}

function parseDelimited(buffer: Buffer, ext: string): ParseResult {
  // إزالة علامة ترتيب البايتات التي تضعها Excel، وإلا فسد أول عنوان.
  const text = buffer.toString("utf8").replace(/^﻿/, "");
  if (ext === "tsv") return { kind: "table", table: parseCsv(text, "\t"), source: "TSV" };

  // Excel العربي يحفظ CSV بفاصلة منقوطة أحيانًا — نختار الفاصل الأكثر تكرارًا.
  const head = text.slice(0, 4000);
  const counts = [",", ";", "\t"].map((d) => [d, head.split(d).length] as const);
  const [delimiter] = counts.sort((a, b) => b[1] - a[1])[0];
  const table = parseCsv(text, delimiter);

  if (table.length === 0) return { kind: "error", message: "الملف النصي فارغ" };
  // ملف نصي بلا فواصل: عامله كنص حرّ.
  if (table.every((r) => r.length === 1)) {
    const fromLines = linesToTable(text);
    if (fromLines.length === 0) return { kind: "error", message: "لم يُعثر على بيانات في الملف" };
    return { kind: "table", table: fromLines, source: "نص حرّ" };
  }
  return { kind: "table", table, source: `CSV (الفاصل «${delimiter === "\t" ? "tab" : delimiter}»)` };
}

/* ————————————————————————— Word ————————————————————————— */

async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  const mammoth = (await import("mammoth")).default;
  const { value: html } = await mammoth.convertToHtml({ buffer });

  const tables = extractHtmlTables(html);
  const biggest = tables.sort((a, b) => b.length - a.length)[0];
  if (biggest && biggest.length > 1) {
    return { kind: "table", table: biggest, source: "Word — جدول" };
  }

  const { value: text } = await mammoth.extractRawText({ buffer });
  const fromLines = linesToTable(text);
  if (fromLines.length === 0) {
    return { kind: "error", message: "لم يُعثر على جدول أو أسماء في ملف Word" };
  }
  return { kind: "table", table: fromLines, source: "Word — نص" };
}

function decodeEntities(html: string) {
  return html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/** استخراج الجداول من ناتج mammoth — وسمٌ نظيف ومولَّد، فلا حاجة لمحلّل HTML. */
function extractHtmlTables(html: string): string[][][] {
  const tables: string[][][] = [];
  for (const tableMatch of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows: string[][] = [];
    for (const rowMatch of tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells: string[] = [];
      for (const cellMatch of rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
        cells.push(cleanCell(decodeEntities(cellMatch[1].replace(/<[^>]+>/g, " "))));
      }
      if (cells.length) rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}
