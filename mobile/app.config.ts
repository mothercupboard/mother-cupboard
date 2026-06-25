import type { ConfigContext, ExpoConfig } from '@expo/config';

import type { AppIconBadgeConfig } from 'app-icon-badge/types';

import 'tsx/cjs';

// adding lint exception as we need to import tsx/cjs before env.ts is imported
// eslint-disable-next-line perfectionist/sort-imports
import Env from './env';

const EAS_PROJECT_ID = '4073602c-9476-4b92-972d-bf5d92746606';
const EXPO_ACCOUNT_OWNER = 'mothercupboard';

// Resolve bundled font files by package specifier so the paths work regardless
// of node_modules layout (pnpm hoisted at the workspace root vs nested).
const nunitoFont = (sub: string): string =>
  require.resolve(`@expo-google-fonts/nunito/${sub}`);

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
  runtimeVersion: {
    policy: 'appVersion',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.OVERRIDE_BUNDLE_ID ?? Env.EXPO_PUBLIC_BUNDLE_ID,
    infoPlist: {
          NSPhotoLibraryUsageDescription: 'Mother Cupboard needs access to your photos to import receipt images.',
      ITSAppUsesNonExemptEncryption: false,
      NSMicrophoneUsageDescription: 'Mother Cupboard uses your microphone so you can add items by voice.',
    },
  },
  experiments: {
    typedRoutes: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2E3C4B',
    },
    package: Env.EXPO_PUBLIC_PACKAGE,
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
  ],
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
});





