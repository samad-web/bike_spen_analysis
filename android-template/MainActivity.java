package app.motopulse.android;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        handleNfcIntent(getIntent());
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleNfcIntent(intent);
    }

    private void handleNfcIntent(Intent intent) {
        if (intent != null && "android.nfc.action.NDEF_DISCOVERED".equals(intent.getAction())) {
            // Normalize NDEF_DISCOVERED to ACTION_VIEW so Capacitor App plugin
            // processes it through the appUrlOpen event listener seamlessly.
            intent.setAction(Intent.ACTION_VIEW);
            setIntent(intent);
        }
    }
}

