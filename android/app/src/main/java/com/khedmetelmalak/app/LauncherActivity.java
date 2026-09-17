package com.khedmetelmalak.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;

/**
 * نقطةُ دخولٍ أصليّة إلى الموقع، لا نسخةٌ منه.
 *
 * تفتح هذه الشاشةُ نافذةً موثوقة (Trusted Web Activity) على العنوان المضبوط في
 * ‎gradle.properties‎. والصفحاتُ التي تُعرض بعدها يجلبها كروم من الخادم لحظتَها،
 * فما يُنشر على الموقع يظهر في التطبيق بلا تحديثٍ للتطبيق. ولا يوجد في هذا
 * الملف — ولا في التطبيق كلّه — صفحةُ HTML واحدة من الموقع.
 *
 * وما يُضاف هنا على السلوك الافتراضي شيءٌ واحد: أوّلُ تشغيلٍ بلا إنترنت.
 * فعاملُ خدمة الموقع لا يوجد بعد على الجهاز، فليس هناك ما يُعرض، وكروم سيُظهر
 * صفحةَ خطئه. فيُفحص الاتصالُ قبل الفتح، وتُعرض شاشةٌ عربية بشعار الكنيسة،
 * وتُفتح النافذةُ من تلقاء نفسها بمجرّد أن يعود الاتصال.
 *
 * أمّا بعد أوّل تشغيلٍ ناجح فلا يُفحص شيء: يُفتح الموقع مباشرةً ولو بلا شبكة،
 * لأن عامل خدمته صار على الجهاز وهو من يتولّى عرض المخزون.
 */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    private static final String PREFS = "khedmet_el_malak";
    private static final String KEY_LAUNCHED_ONCE = "launched_once";

    private ConnectivityManager connectivity;
    private ConnectivityManager.NetworkCallback awaitingNetwork;

    @Override
    protected boolean shouldLaunchImmediately() {
        return hasLaunchedBefore() || isOnline();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (shouldLaunchImmediately()) {
            rememberLaunch();
            return;
        }

        setContentView(R.layout.activity_offline);
        findViewById(R.id.offline_retry).setOnClickListener(view -> retry());
        waitForNetwork();
    }

    @Override
    protected void onDestroy() {
        stopWaiting();
        super.onDestroy();
    }

    private void retry() {
        if (isOnline()) {
            launchNow();
            return;
        }
        TextView status = findViewById(R.id.offline_status);
        status.setVisibility(View.VISIBLE);
    }

    /** يُفتح الموقع بمجرّد ظهور شبكة، بلا أن يضغط المستخدم شيئًا. */
    private void waitForNetwork() {
        connectivity = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (connectivity == null) return;

        awaitingNetwork = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                runOnUiThread(LauncherActivity.this::launchNow);
            }
        };
        NetworkRequest request = new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();
        connectivity.registerNetworkCallback(request, awaitingNetwork);
    }

    private void stopWaiting() {
        if (connectivity != null && awaitingNetwork != null) {
            try {
                connectivity.unregisterNetworkCallback(awaitingNetwork);
            } catch (IllegalArgumentException ignored) {
                // سُجّل مرةً واحدة، وإلغاؤه مرتين لا يضرّ.
            }
            awaitingNetwork = null;
        }
    }

    private void launchNow() {
        stopWaiting();
        rememberLaunch();
        launchTwa();
    }

    private boolean isOnline() {
        ConnectivityManager manager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (manager == null) return true; // لا نمنع الفتح لأننا لم نستطع السؤال.
        Network network = manager.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private SharedPreferences prefs() {
        return getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private boolean hasLaunchedBefore() {
        return prefs().getBoolean(KEY_LAUNCHED_ONCE, false);
    }

    private void rememberLaunch() {
        prefs().edit().putBoolean(KEY_LAUNCHED_ONCE, true).apply();
    }
}
