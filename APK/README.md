# ملف التطبيق (APK)

```
APK/Khedmet-El-Malak.apk
```

| | |
|---|---|
| اسم التطبيق | **Khedmet El Malak** |
| معرّف الحزمة | `com.khedmetelmalak.app` |
| النسخة | 1.0.1 (versionCode 2) |
| الموقع الذي يفتحه | `https://elmalak-sillk.vercel.app/` |
| أدنى أندرويد | 6.0 (API 23) |
| الحجم | ‎3.1 ميجابايت |
| بصمة التوقيع | `B9:E4:C0:24:27:A4:47:2F:2C:16:1A:F1:EE:39:02:DF:16:27:79:32:C8:5A:2D:38:92:8E:D0:46:5E:B9:E4:0E` |
| التوقيع | ذاتيّ (v1 + v2/v3) |

التطبيق **لا يحمل نسخةً من الموقع**: يفتح المنشور على العنوان أعلاه. فتعديلُ
الموقع ونشرُه يصل إلى الأجهزة بلا ملفٍّ جديد.

## التثبيت

**إن كانت عندك نسخةٌ سابقة فاحذفها أولًا**: هذا البناء موقَّعٌ بمفتاحٍ مختلف،
وأندرويد لا يستبدل تطبيقًا بآخر يختلف توقيعُه.

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
