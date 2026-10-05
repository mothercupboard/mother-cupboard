import type { ConfigContext, ExpoConfig } from '@expo/config';

import type { AppIconBadgeConfig } from 'app-icon-badge/types';

import 'tsx/cjs';

// adding lint exception as we need to import tsx/cjs before env.ts is imported
// eslint-disable-next-line perfectionist/sort-imports
import Env from './env';

const EAS_PROJECT_ID = '4073602c-9476-4b92-972d-bf5d92746606';
const EXPO_ACCOUNT_OWNER = 'mothercupboard';

// Meta (Facebook) app used for app-install ad attribution. The App ID and
// client token are public identifiers by design (they ship inside the binary);
// the app secret is NOT used client-side.
const META_APP_ID = '1521066603234903';
const META_CLIENT_TOKEN = '2c4741f48b74f0dad4a2724fcc2c4fa5';
const NAME_FOR_META = 'Mother Cupboard';
const TRACKING_PERMISSION_TEXT
  = 'This lets us see whether our adverts are bringing people to Mother Cupboard. It does not affect what you see in the app.';

// Resolve bundled font files by package specifier so the paths work regardless
// of node_modules layout (pnpm hoisted at the workspace root vs nested).
function nunitoFont(sub: string): string {
  return require.resolve(`@expo-google-fonts/nunito/${sub}`);
}

const appIconBadgeConfig: AppIconBadgeConfig = {
  enabled: Env.EXPO_PUBLIC_APP_ENV !== 'production',
  badges: [
    {
      text: Env.EXPO_PUBLIC_APP_ENV,
      type: 'banner',
      color: 'white',
    },
    {
      text: Env.EXPO_PUBLIC_VERSION.toString(),
      type: 'ribbon',
      color: 'white',
    },
  ],
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.EXPO_PUBLIC_NAME,
  description: `${Env.EXPO_PUBLIC_NAME} Mobile App`,
  owner: EXPO_ACCOUNT_OWNER,
  scheme: Env.EXPO_PUBLIC_SCHEME,
  slug: 'mother-cupboard',
  version: Env.EXPO_PUBLIC_VERSION.toString(),
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  updates: {
    url: 'https://u.expo.dev/4073602c-9476-4b92-972d-bf5d92746606',
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: '1.3.0',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.OVERRIDE_BUNDLE_ID ?? Env.EXPO_PUBLIC_BUNDLE_ID,
    infoPlist: {
      NSPhotoLibraryUsageDescription: 'Mother Cupboard needs access to your photos to import receipt images.',
      ITSAppUsesNonExemptEncryption: false,
      NSMicrophoneUsageDescription: 'Mother Cupboard uses your microphone so you can add items by voice.',
      NSUserTrackingUsageDescription: TRACKING_PERMISSION_TEXT,
      // SKAdNetwork IDs Meta needs for iOS install attribution without IDFA.
      SKAdNetworkItems: [
        { SKAdNetworkIdentifier: 'v9wttpbfk9.skadnetwork' },
        { SKAdNetworkIdentifier: 'n38lu8286q.skadnetwork' },
      ],
    },
  },
  experiments: {
    typedRoutes: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FAECD0',
    },
    package: Env.EXPO_PUBLIC_PACKAGE,
    // Android 13+ needs this for the advertising ID the Meta SDK uses for attribution.
    permissions: ['com.google.android.gms.permission.AD_ID'],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FAF6F0',
        image: './assets/splash-icon.png',
        imageWidth: 200,
      },
    ],
    [
      'expo-font',
      {
        ios: {
          fonts: [
            nunitoFont('400Regular/Nunito_400Regular.ttf'),
            nunitoFont('400Regular_Italic/Nunito_400Regular_Italic.ttf'),
            nunitoFont('600SemiBold/Nunito_600SemiBold.ttf'),
            nunitoFont('700Bold/Nunito_700Bold.ttf'),
            nunitoFont('800ExtraBold/Nunito_800ExtraBold.ttf'),
          ],
        },
        android: {
          fonts: [
            {
              fontFamily: 'Nunito',
              fontDefinitions: [
                {
                  path: nunitoFont('400Regular/Nunito_400Regular.ttf'),
                  weight: 400,
                },
                {
                  path: nunitoFont('400Regular_Italic/Nunito_400Regular_Italic.ttf'),
                  weight: 400,
                  style: 'italic',
                },
                {
                  path: nunitoFont('600SemiBold/Nunito_600SemiBold.ttf'),
                  weight: 600,
                },
                {
                  path: nunitoFont('700Bold/Nunito_700Bold.ttf'),
                  weight: 700,
                },
                {
                  path: nunitoFont('800ExtraBold/Nunito_800ExtraBold.ttf'),
                  weight: 800,
                },
              ],
            },
          ],
        },
      },
    ],
    'expo-localization',
    'expo-router',
    ['app-icon-badge', appIconBadgeConfig],
    'expo-sqlite',
    ['@morrowdigital/watermelondb-expo-plugin', { disableJsi: false }],
    ['expo-camera', { cameraPermission: 'Mother Cupboard needs camera access to scan product barcodes.' }],
    ['expo-notifications'],
    '@react-native-community/datetimepicker',
    ['@sentry/react-native/expo', { organization: 'mother-cupboard-ltd', project: 'react-native' }],
    ['expo-tracking-transparency', { userTrackingPermission: TRACKING_PERMISSION_TEXT }],
    [
      'react-native-fbsdk-next',
      {
        appID: META_APP_ID,
        clientToken: META_CLIENT_TOKEN,
        displayName: NAME_FOR_META,
        scheme: `fb${META_APP_ID}`,
        // Install + app-activation events are logged automatically by the SDK.
        autoLogAppEventsEnabled: true,
        advertiserIDCollectionEnabled: true,
        isAutoInitEnabled: true,
        iosUserTrackingPermission: TRACKING_PERMISSION_TEXT,
      },
    ],
  ],
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
});
