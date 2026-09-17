# ملف التطبيق (APK)

```
APK/Khedmet-El-Malak.apk
```

| | |
|---|---|
| اسم التطبيق | **Khedmet El Malak** |
| معرّف الحزمة | `com.khedmetelmalak.app` |
| النسخة | 1.0.0 (versionCode 1) |
| الموقع الذي يفتحه | `https://elmalak-sillk.vercel.app/` |
| أدنى أندرويد | 6.0 (API 23) |
| الحجم | ‎3.1 ميجابايت |
| التوقيع | ذاتيّ (v1 + v2/v3) |

التطبيق **لا يحمل نسخةً من الموقع**: يفتح المنشور على العنوان أعلاه. فتعديلُ
الموقع ونشرُه يصل إلى الأجهزة بلا ملفٍّ جديد.

## التثبيت

انقل الملف إلى الهاتف وافتحه. أندرويد سيسأل عن السماح بالتثبيت من هذا المصدر
(التطبيق ليس على متجر Play) — اسمح، ثم ثبّت.

## إعادة البناء

تبويب **Actions** ← **«بناء تطبيق أندرويد»** ← **Run workflow**. العنوان يُقرأ
من `android/gradle.properties`، والملف الناتج يحلّ محلّ هذا الملف هنا.

أو على جهازك (يحتاج Java 17 وAndroid SDK):

```bash
cd android
./gradlew assembleRelease
cp app/build/outputs/apk/release/*.apk ../APK/Khedmet-El-Malak.apk
```

## ⚠ مفتاح التوقيع

هذا البناء موقَّعٌ بمفتاح تطويرٍ وُلِّد أثناء البناء، فهو يُثبَّت ويعمل، لكن:

- كلُّ بناءٍ لاحق سيحمل توقيعًا مختلفًا، فلن يُحدِّث المثبَّت على الأجهزة
  (سيُطلب حذف القديم أولًا)،
- وبصمةُ `ANDROID_CERT_SHA256` على الموقع ستبطل، فيعود شريط العنوان.

للحلّ مرةً واحدة وإلى الأبد:

```bash
keytool -genkeypair -v -keystore khedmet.jks -alias khedmet \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 khedmet.jks      # ضع الناتج في سرّ ANDROID_KEYSTORE_BASE64
```

ثم في **Settings → Secrets and variables → Actions**:
`ANDROID_KEYSTORE_BASE64`، `ANDROID_KEYSTORE_PASSWORD`، `ANDROID_KEY_ALIAS`،
`ANDROID_KEY_PASSWORD`. واحفظ ملف `khedmet.jks` في مكانٍ آمن ولا ترفعه إلى
المستودع — ضياعُه يعني أن التطبيق لن يُحدَّث أبدًا.
