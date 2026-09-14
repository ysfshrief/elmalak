"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf7ef",
          color: "#23271f",
          fontFamily: "'Segoe UI', Tahoma, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>تعذّر تشغيل التطبيق</h1>
          <p style={{ fontSize: "0.9rem", color: "#635c48", lineHeight: 1.8 }}>
            تأكد من وجود ملف <code>.env</code> وبه <code>AUTH_SECRET</code> و<code>DATABASE_URL</code>، وأن قاعدة
            البيانات مُهيّأة عبر <code>npm run db:migrate</code> ثم <code>npm run db:seed</code>.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#948c72" }}>رقم الخطأ: {error.digest}</p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              padding: "0.6rem 1.25rem",
              borderRadius: "12px",
              border: "none",
              background: "#ab8324",
              color: "#fffdf7",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
