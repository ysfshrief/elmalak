import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "elmalak_session";
// صفحةُ الفحص عامّة عمدًا: يُحتاج إليها حين لا يستطيع المستخدم الدخول أو حين
// لا تظهر له القائمة، وهي لا تعرض إلا رقم النسخة وما يخصّ جلسته هو.
const PUBLIC_PATHS = ["/login", "/diag"];

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    // ملفات محرّك القراءة الضوئية: برامج وبيانات لغة لا بيانات مخدومين،
    // ويطلبها عاملُ الخلفية في المتصفّح فلا يُعتمد على وصول الكعكة إليه.
    pathname.startsWith("/ocr/") ||
    pathname === "/favicon.ico";

  const authed = await hasValidSession(request);

  if (!isPublic && !authed) {
    // مسارات الواجهة البرمجية تُجيب برمز حالة لا بتحويل إلى صفحة الدخول:
    // التحويل يجعل الطلب ينجح بـ٢٠٠ ومعه صفحة HTML، فتظنّه الواجهة صورةً
    // أو ردًّا صالحًا، ويضيع الخبر الحقيقي: أن الجلسة انتهت.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "انتهت الجلسة — سجّل الدخول مرة أخرى" },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|ocr/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
