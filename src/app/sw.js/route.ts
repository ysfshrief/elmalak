/**
 * عامل الخدمة (Service Worker) يُخدَم من مسارٍ لا من ملفٍ ساكن.
 *
 * السبب واحد: رقمُ النسخة يُحقن فيه وقتَ البناء، فيختلف محتواه بين نشرةٍ
 * وأخرى. والمتصفّح لا يُحدّث عامل الخدمة إلا إذا تغيّرت بايتاتُه، فلو كان
 * ملفًا ساكنًا ثابتًا لبقي القديمُ قائمًا إلى الأبد ومعه مخزونُه القديم.
 *
 * وهذا هو الشرط الذي لا يُتنازل عنه: لا يجوز أن يَعلَق مستخدمٌ على نسخةٍ
 * قديمة من الموقع. ولذلك:
 *   - الصفحات تُطلب من الشبكة أولًا، والمخزون احتياطٌ عند انقطاعها لا أصلٌ.
 *   - ملفات البناء الساكنة مخزونها آمن لأن عناوينها تحمل بصمة محتواها.
 *   - كل مخزونٍ لا يحمل رقم النسخة الحالية يُحذف عند التفعيل.
 *   - هذا الملف نفسه يُخدَم بـ`no-cache`، فيُعاد سؤال الخادم عنه دائمًا.
 */

export const dynamic = "force-dynamic";

// اسمُ المخزن يُشتقّ من النسخة، فيُنقّى مما لا يصلح في المفاتيح.
const VERSION = `${process.env.APP_COMMIT || "dev"}-${process.env.APP_BUILT_AT || "0"}`
  .replace(/[^\w.-]+/g, "-")
  .toLowerCase();

const SOURCE = String.raw`
const VERSION = "__VERSION__";
const PAGES = "pages-" + VERSION;
const STATIC = "static-" + VERSION;
const MEDIA = "media-" + VERSION;
const KEEP = [PAGES, STATIC, MEDIA];

const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/logos/church-logo.png"];
const NETWORK_TIMEOUT_MS = 6000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "SKIP_WAITING") self.skipWaiting();
  // عند تسجيل الخروج: لا يبقى على الجهاز أثرٌ لصفحاتِ من خرج.
  if (type === "CLEAR_CACHES") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }
});

function fromNetworkWithin(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** يُخزَّن الردّ الناجح المباشر وحده: التحويلات وأخطاء الخادم لا تُخزَّن. */
function cacheable(response) {
  return response && response.ok && response.status === 200 && !response.redirected && response.type === "basic";
}

async function networkFirstPage(request) {
  try {
    const response = await fromNetworkWithin(request, NETWORK_TIMEOUT_MS);
    if (cacheable(response)) {
      const copy = response.clone();
      caches.open(PAGES).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("غير متصل بالإنترنت", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (cacheable(response)) {
    const copy = response.clone();
    caches.open(cacheName).then((cache) => cache.put(request, copy));
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((response) => {
      if (cacheable(response)) {
        const copy = response.clone();
        caches.open(cacheName).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // لا يُخزَّن شيءٌ من الواجهة البرمجية: فيها صورُ المخدومين وبياناتُهم، وهي
  // خاصّة. ولا تُخزَّن صفحةُ الدخول ولا صفحةُ الفحص.
  if (url.pathname.startsWith("/api/") || url.pathname === "/login" || url.pathname === "/diag") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // عناوين ملفات البناء تحمل بصمة محتواها، فتغيّرُ الملف يعني عنوانًا جديدًا.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }

  if (request.destination === "image" || request.destination === "font" || url.pathname.startsWith("/icons/")) {
    event.respondWith(staleWhileRevalidate(request, MEDIA));
  }
});
`;

export function GET() {
  return new Response(SOURCE.replace("__VERSION__", VERSION), {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      // لا يُخزَّن عاملُ الخدمة نفسه: وإلا لَما وصل التحديث أبدًا.
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
