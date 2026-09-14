/**
 * يبني ملف استيراد نظيفًا من بيانات خام — لكشفٍ استُخرج من ملف مصوَّر أو
 * ورقي، فيصل إلى الموقع مضمونًا لا يحتاج تصحيحًا.
 *
 * يستعمل نفس تعريف الأعمدة ونفس محلّلات القيم التي يستعملها الموقع عند
 * القراءة، فما يقبله هذا الملف يقبله الموقع بالضرورة. وما لا يفهمه يُبلَّغ
 * عنه هنا قبل التسليم، لا بعد الرفع.
 *
 *   npm run make:import-file -- rows.json [out.xlsx]
 *
 * ‎rows.json‎ مصفوفة كائنات، مفاتيحها إمّا عناوين القالب العربية
 * («الاسم»، «تاريخ الميلاد»...) أو أسماء الحقول الإنجليزية
 * (‎fullName‎، ‎birthDate‎...)، أو كائن ‎{ grades: [...], rows: [...] }‎
 * لإضافة قائمة الصفوف المنسدلة.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { COLUMNS, PHONE_COLUMNS, type ColumnKey } from "../src/lib/import/columns";
import {
  cleanCell,
  matchColumn,
  parseDateValue,
  parseGenderValue,
  parsePhoneLabel,
  parsePhoneValue,
} from "../src/lib/import/normalize";
import { buildTemplateWorkbook, type TemplateRow } from "../src/lib/import/template";

const GENDER_TEXT = { MALE: "ذكر", FEMALE: "أنثى", "": "" } as const;

type RawRow = Record<string, unknown>;

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const [inputPath, outputPath = "كشف-جاهز-للرفع.xlsx"] = process.argv.slice(2);
if (!inputPath) fail("الاستعمال: npm run make:import-file -- rows.json [out.xlsx]");

let parsed: unknown;
try {
  parsed = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
} catch (error) {
  fail(`تعذّرت قراءة ${inputPath}: ${error instanceof Error ? error.message : error}`);
}

const payload = (
  Array.isArray(parsed) ? { rows: parsed, grades: [] } : (parsed as Record<string, unknown>)
) as { rows?: unknown; grades?: unknown };

const rawRows = payload.rows;
if (!Array.isArray(rawRows)) fail("الملف يجب أن يحوي مصفوفة صفوف");

const grades = (Array.isArray(payload.grades) ? payload.grades : [])
  .map((g) => (typeof g === "string" ? g : String((g as { path?: string })?.path ?? "")))
  .filter(Boolean)
  .map((path) => ({ path }));

/** يترجم مفاتيح الكائن — عربية كانت أو إنجليزية — إلى مفاتيح الأعمدة. */
function keyOf(key: string): ColumnKey | null {
  const direct = COLUMNS.find((c) => c.key === key);
  if (direct) return direct.key;
  return matchColumn(key);
}

const problems: string[] = [];
const rows: TemplateRow[] = [];

(rawRows as RawRow[]).forEach((raw, index) => {
  const line = index + 1;
  const source: Partial<Record<ColumnKey, unknown>> = {};
  const unknownKeys: string[] = [];

  for (const [key, value] of Object.entries(raw)) {
    const column = keyOf(key);
    if (!column) {
      if (cleanCell(value)) unknownKeys.push(key);
      continue;
    }
    // مفتاحان يؤولان إلى عمود واحد: الأول يفوز، والثاني يُبلَّغ عنه.
    if (source[column] !== undefined && cleanCell(source[column])) unknownKeys.push(key);
    else source[column] = value;
  }
  if (unknownKeys.length) {
    problems.push(`سطر ${line}: حقول لم تُفهم فأُهملت — ${unknownKeys.join("، ")}`);
  }

  const fullName = cleanCell(source.fullName);
  if (!fullName) {
    problems.push(`سطر ${line}: بلا اسم — أُسقط`);
    return;
  }

  const row: TemplateRow = {
    fullName,
    gradePath: cleanCell(source.gradePath),
    school: cleanCell(source.school),
    confessionFather: cleanCell(source.confessionFather),
    address: cleanCell(source.address),
    notes: cleanCell(source.notes),
  };

  const genderText = cleanCell(source.gender);
  const gender = parseGenderValue(genderText);
  if (genderText && !gender) problems.push(`سطر ${line}: النوع «${genderText}» غير مفهوم — تُرك فارغًا`);
  row.gender = GENDER_TEXT[gender];

  const birthText = cleanCell(source.birthDate);
  if (birthText) {
    const birth = parseDateValue(birthText);
    if (birth.iso) {
      const [y, m, d] = birth.iso.split("-");
      row.birthDate = `${d}/${m}/${y}`;
    } else {
      problems.push(`سطر ${line}: تاريخ «${birthText}» غير مفهوم — تُرك فارغًا`);
    }
  }

  PHONE_COLUMNS.forEach((slot, i) => {
    const text = cleanCell(source[slot.number]);
    if (!text) return;
    const phone = parsePhoneValue(text);
    if (!phone.number) {
      problems.push(`سطر ${line}: ${phone.error ?? `رقم غير صالح: «${text}»`} — تُرك فارغًا`);
      return;
    }
    row[slot.number] = phone.number;
    row[slot.label] = parsePhoneLabel(source[slot.label], i === 0 ? "الأب" : "أخرى");
  });

  rows.push(row);
});

async function write() {
  const buffer = await buildTemplateWorkbook({ grades, rows });
  writeFileSync(resolve(outputPath), buffer);

  console.log(`✓ ${rows.length} مخدومًا في ${outputPath}`);
  if (grades.length) console.log(`  قائمة الصفوف المنسدلة: ${grades.length} صفًا`);
  if (problems.length) {
    console.log(`\n⚠ ${problems.length} ملاحظة تحتاج مراجعة قبل التسليم:`);
    for (const problem of problems) console.log(`  • ${problem}`);
    process.exitCode = 2;
  }
}

void write();
