import java.net.URI

plugins {
    id("com.android.application")
}

/**
 * العنوان يُقرأ من `gradle.properties`، ومنه وحده.
 *
 * ولو بقي العنوان الافتراضي فشل البناء عمدًا: تطبيقٌ يفتح عنوانًا لا وجود له
 * أسوأ من بناءٍ يتوقّف ويقول السبب.
 */
val websiteUrl: String = (project.findProperty("WEBSITE_URL") as String? ?: "").trim()
require(websiteUrl.startsWith("https://") && !websiteUrl.contains("REPLACE-WITH")) {
    """
    ✗ لم يُضبط عنوان الموقع.
      افتح android/gradle.properties وضع عنوان موقعك المنشور:
          WEBSITE_URL=https://your-site.example
      أو مرّره عند البناء:
          ./gradlew assembleRelease -PWEBSITE_URL=https://your-site.example
    """.trimIndent()
}

val websiteHost: String = URI(websiteUrl).host
    ?: throw GradleException("WEBSITE_URL غير صالح: $websiteUrl")

/** أصلُ الموقع (بروتوكول + نطاق) بلا مسار — هكذا يطلبه إعلانُ الربط. */
val websiteOrigin: String = URI(websiteUrl).let { "${it.scheme}://${it.host}" }

android {
    namespace = "com.khedmetelmalak.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.khedmetelmalak.app"
        minSdk = 23
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.1"

        // العنوان والنطاق يصلان إلى الموارد والبيان من مكانٍ واحد.
        resValue("string", "launch_url", websiteUrl)
        // إعلانُ الربط كما يقرأه كروم: علاماتُ الاقتباس مهرَّبة لأنها تدخل
        // ملفَّ موارد XML.
        resValue(
            "string",
            "asset_statements",
            "[{\\\"relation\\\": [\\\"delegate_permission/common.handle_all_urls\\\"], " +
                "\\\"target\\\": {\\\"namespace\\\": \\\"web\\\", \\\"site\\\": \\\"$websiteOrigin\\\"}}]"
        )
        manifestPlaceholders["hostName"] = websiteHost
    }

    signingConfigs {
        // مفتاح التوقيع لا يدخل المستودع أبدًا. يُقرأ من ملفٍ محلّي أو من
        // متغيّرات بيئة (خادم البناء)، فإن لم يوجد وُقّع البناءُ بمفتاح
        // التطوير الافتراضي — يُثبَّت على الأجهزة ولا يصلح للنشر على Play.
        create("release") {
            val storePath = System.getenv("ANDROID_KEYSTORE_PATH")
            if (!storePath.isNullOrBlank() && file(storePath).exists()) {
                storeFile = file(storePath)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            val configured = signingConfigs.getByName("release").storeFile != null
            signingConfig = if (configured) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

}

/**
 * ‏`kotlin-stdlib` منذ 1.8 استوعب `kotlin-stdlib-jdk7` و`jdk8`، فمن يجلب
 * القديمَين مع الجديد تتكرّر عنده آلافُ الأصناف ويتوقّف البناء. ومكتبةُ
 * المتصفّح تجلبهما بنسخةٍ قديمة، فيُستبعدان صراحةً.
 */
configurations.configureEach {
    exclude(group = "org.jetbrains.kotlin", module = "kotlin-stdlib-jdk7")
    exclude(group = "org.jetbrains.kotlin", module = "kotlin-stdlib-jdk8")
}

dependencies {
    // نافذةٌ موثوقة على الموقع: كروم هو من يعرض الصفحات، لا عارضٌ مدمج.
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.5.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
}
