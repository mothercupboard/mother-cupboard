import * as TrackingTransparency from 'expo-tracking-transparency';
import { Platform } from 'react-native';
import { AppEventsLogger, Settings } from 'react-native-fbsdk-next';

// Meta (Facebook) SDK glue for app-install ad attribution.
//
// The SDK is auto-initialised by the config plugin (isAutoInitEnabled) and
// logs install / app-activation events itself (autoLogAppEventsEnabled), so
// there is nothing to call on every launch. The one thing it cannot do alone
// is ask for iOS App Tracking Transparency permission: without that, iOS
// installs are only attributed through SKAdNetwork (aggregated, delayed).
//
// Call `configureMetaTracking()` once the user is past the onboarding
// disclosures so the ATT prompt appears in context rather than on a cold
// first launch. It is safe to call repeatedly; iOS only shows the prompt once.

let configured = false;

export async function configureMetaTracking(): Promise<void> {
  if (configured)
    return;
  configured = true;

  try {
    if (Platform.OS === 'ios') {
      const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
      const granted = status === TrackingTransparency.PermissionStatus.GRANTED;
      await Settings.setAdvertiserTrackingEnabled(granted);
    }
    else {
      await Settings.setAdvertiserTrackingEnabled(true);
    }

    // Belt and braces: auto-init normally handles this, but initialising
    // again is a no-op and guarantees the activation event goes out.
    Settings.initializeSDK();
    AppEventsLogger.logEvent('fb_mobile_activate_app');
  }
  catch (err) {
    // Attribution is best effort; never let it affect the app.
    console.warn('[Meta] tracking setup failed:', (err as Error)?.message);
  }
}
