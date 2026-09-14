/**
 * توليد قالب الاستيراد (xlsx).
 *
 * القالب هو الطريق الذي «لا يحتمل الخطأ»: العناوين مكتوبة بالضبط كما يتوقّعها
 * القارئ، والأعمدة التي لها قيم محدودة (الصف، النوع، صاحب التليفون) قوائم
 * منسدلة لا تقبل غيرها، وعمود تاريخ الميلاد منسّق كتاريخ. فالملف يُملأ
 * بالاختيار لا بالكتابة، ويصل إلى النظام مفهومًا من أول مرة.
 *
 * تستعمله واجهة التنزيل وأداة سطر الأوامر معًا، فيستحيل أن يختلف شكل
 * الملف الذي نعطيه عن الملف الذي نقرؤه.
 */
import ExcelJS from "exceljs";
import {
  COLUMNS,
  GENDER_LABELS_AR,
  MAX_IMPORT_ROWS,
  PHONE_LABELS,
  type ColumnKey,
} from "./columns";

export type TemplateGrade = { path: string };

export type TemplateRow = Partial<Record<ColumnKey, string>>;

const DATA_SHEET = "المخدومون";
const HELP_SHEET = "تعليمات";
const LISTS_SHEET = "Lists";

const BRAND = "FF7B1E3C";
const BRAND_SOFT = "FFF6EAEF";

export async function buildTemplateWorkbook(options: {
  grades: TemplateGrade[];
  rows?: TemplateRow[];
  serviceName?: string;
}): Promise<Buffer> {
  const { grades, rows = [], serviceName = "خدمة التربية الكنسية" } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = serviceName;
  workbook.created = new Date();

  /* ——— ورقة القوائم المخفيّة: مرجع القوائم المنسدلة ——— */
  const lists = workbook.addWorksheet(LISTS_SHEET);
  lists.state = "veryHidden";
  lists.getCell("A1").value = "الصفوف";
  grades.forEach((g, i) => {
    lists.getCell(`A${i + 2}`).value = g.path;
  });
  lists.getCell("B1").value = "النوع";
  Object.values(GENDER_LABELS_AR).forEach((v, i) => {
    lists.getCell(`B${i + 2}`).value = v;
  });
  lists.getCell("C1").value = "صاحب التليفون";
  PHONE_LABELS.forEach((v, i) => {
    lists.getCell(`C${i + 2}`).value = v;
  });

  /* ——— ورقة البيانات ——— */
  const sheet = workbook.addWorksheet(DATA_SHEET, {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const header = sheet.getRow(1);
  header.height = 30;
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  header.eachCell((cell, col) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.border = { bottom: { style: "medium", color: { argb: BRAND } } };
    const def = COLUMNS[col - 1];
    if (def?.hint) cell.note = def.hint;
  });

  // الصفوف المعبّأة مسبقًا (حين نُسلّم ملفًا مستخرجًا من كشف ورقي).
  rows.forEach((row) => {
    sheet.addRow(Object.fromEntries(COLUMNS.map((c) => [c.key, row[c.key] ?? ""])));
  });

  const lastRow = Math.max(rows.length + 1, MAX_IMPORT_ROWS);
  const indexOf = (key: ColumnKey) => COLUMNS.findIndex((c) => c.key === key) + 1;

  const validations: { column: number; formula: string; message: string }[] = [
    {
      column: indexOf("gender"),
      formula: `${LISTS_SHEET}!$B$2:$B$3`,
      message: "اختر «ذكر» أو «أنثى» من القائمة.",
    },
    ...(["phone1Label", "phone2Label", "phone3Label"] as ColumnKey[]).map((key) => ({
      column: indexOf(key),
      formula: `${LISTS_SHEET}!$C$2:$C$${PHONE_LABELS.length + 1}`,
      message: "اختر صاحب الرقم من القائمة.",
    })),
  ];
  if (grades.length > 0) {
    validations.unshift({
      column: indexOf("gradePath"),
      formula: `${LISTS_SHEET}!$A$2:$A$${grades.length + 1}`,
      message: "اختر الصف من القائمة. اتركه فارغًا ليأخذ الصف المحدَّد وقت الرفع.",
    });
  }

  for (let r = 2; r <= lastRow; r++) {
    for (const v of validations) {
      sheet.getRow(r).getCell(v.column).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [v.formula],
        showErrorMessage: true,
        errorStyle: "stop",
        errorTitle: "قيمة غير مقبولة",
        error: v.message,
      };
    }
  }

  const birthColumn = sheet.getColumn(indexOf("birthDate"));
  birthColumn.numFmt = "dd/mm/yyyy";
  birthColumn.alignment = { horizontal: "center" };

  const nameColumn = sheet.getColumn(indexOf("fullName"));
  nameColumn.font = { bold: true };

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  /* ——— ورقة التعليمات ——— */
  const help = workbook.addWorksheet(HELP_SHEET, { views: [{ rightToLeft: true }] });
  help.getColumn(1).width = 26;
  help.getColumn(2).width = 86;

  const title = help.addRow([serviceName, ""]);
  title.font = { bold: true, size: 15, color: { argb: BRAND } };
  help.addRow(["قالب كشف المخدومين", ""]).font = { bold: true, size: 12 };
  help.addRow([]);

  const sectionRow = (text: string) => {
    const row = help.addRow([text, ""]);
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    return row;
  };

  sectionRow("طريقة الاستعمال");
  for (const line of [
    ["١", `اكتب كل مخدوم في سطر داخل ورقة «${DATA_SHEET}». لا تُغيّر أسماء الأعمدة ولا ترتيبها.`],
    ["٢", "«الاسم» هو الحقل الوحيد المطلوب. باقي الحقول تُترك فارغة إن لم تكن معروفة."],
    ["٣", "الأعمدة الملوّنة بقائمة منسدلة لا تقبل إلا الاختيار منها — اضغط على الخلية واختر."],
    ["٤", "تاريخ الميلاد بصيغة يوم/شهر/سنة، مثال: 12/05/2013."],
    ["٥", "احفظ الملف بصيغة xlsx ثم ارفعه من صفحة «استيراد كشف» في الموقع."],
    ["٦", "الموقع يعرض لك ما قرأه في جدول للمراجعة والتعديل قبل الحفظ — راجعه دائمًا."],
  ]) {
    help.addRow(line).alignment = { vertical: "top", wrapText: true };
  }
  help.addRow([]);

  sectionRow("الأعمدة");
  for (const col of COLUMNS) {
    const row = help.addRow([col.header + (col.required ? " (مطلوب)" : ""), col.hint ?? ""]);
    row.alignment = { vertical: "top", wrapText: true };
    if (col.required) row.getCell(1).font = { bold: true, color: { argb: BRAND } };
  }
  help.addRow([]);

  sectionRow("ملاحظات");
  for (const line of [
    ["الصف", "إن ترك عمود «الصف» فارغًا، يُسجَّل المخدوم في الصف الذي تختاره وقت الرفع."],
    ["التكرار", "الموقع ينبّهك إذا كان الاسم مسجّلًا في الصف نفسه هذا العام، ولا يضيفه مرتين."],
    ["الحد الأقصى", `${MAX_IMPORT_ROWS} مخدومًا في الملف الواحد.`],
    ["الصلاحيات", "لا يمكنك الاستيراد إلا إلى الصفوف التي تخدم فيها."],
  ]) {
    help.addRow(line).alignment = { vertical: "top", wrapText: true };
  }

  help.eachRow((row) => {
    if (!row.getCell(1).fill || row.getCell(1).fill.type !== "pattern") {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_SOFT } };
    }
  });

  // exceljs يعلن نوع Buffer الخاص به؛ والقيمة في Node هي Buffer الحقيقي.
  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}

export const TEMPLATE_FILENAME = "قالب-كشف-المخدومين.xlsx";
