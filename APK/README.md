# ملف التطبيق (APK)

هنا يوضع ملفُ تطبيق أندرويد الجاهز للتثبيت:

```
APK/Khedmet-El-Malak.apk
```

## لماذا ليس موجودًا بعد؟

بناءُ أي تطبيق أندرويد يحتاج **حزمة تطوير أندرويد (Android SDK)**: ملفُّ المنصّة
`android.jar` وأدوات `aapt2` و`d8` و`apksigner`. وهذه كلُّها تُنزَّل من مضيف
واحد هو `dl.google.com`، وهو **محجوبٌ بسياسة الشبكة في البيئة التي كُتب فيها
هذا المشروع** (يردّ الوسيطُ بـ403 على الاتصال به). فلا يمكن بناء الملف هناك،
ولا يصحّ أن يوضع هنا ملفٌ لم يُبنَ فعلًا.

أمّا مشروع أندرويد نفسه فمكتملٌ في `android/`، وينقصه أمران: عنوانُ الموقع،
وجهازٌ عنده الحزمة.

## الطريق الأول: خوادم GitHub (بلا تثبيت شيء على جهازك)

خوادم GitHub تأتي بحزمة أندرويد مثبّتة. في المستودع تدفّقُ عملٍ جاهز:

1. افتح تبويب **Actions** في المستودع.
2. اختر **«بناء تطبيق أندرويد»** ثم **Run workflow**.
3. ضع عنوان موقعك المنشور (مثال: `https://elmalak.vercel.app`).
4. بعد دقائق:
   - يُرفع الملف كمخرَج للتنزيل (Artifacts)،
   - ويُحفظ هنا في `APK/Khedmet-El-Malak.apk`،
   - وتُطبع **بصمةُ التوقيع** في ملخّص التشغيل — انسخها إلى متغيّر البيئة
     `ANDROID_CERT_SHA256` على الموقع، فيختفي شريطُ العنوان داخل التطبيق.

## الطريق الثاني: جهازك

```bash
cd android
./gradlew assembleRelease -PWEBSITE_URL=https://your-site.example
# الناتج: android/app/build/outputs/apk/release/Khedmet-El-Malak-release.apk
cp android/app/build/outputs/apk/release/*.apk APK/Khedmet-El-Malak.apk
```

يحتاج: Java 17 وAndroid SDK (أو Android Studio، وهو يجلبها).
