import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { useState } from 'react';
import { useTheme } from 'react-native-paper';

import { SIDEBAR_WIDTH, TabletSidebar } from '@/components/common/tablet-sidebar';
import { ConversionPrompt } from '@/features/auth/components/conversion-prompt';
import { useConversionPromptStore } from '@/features/auth/conversion-prompt-store';
import { useTrialStatus } from '@/features/auth/trial-store';
import { useExpiryAlerts } from '@/features/notifications/use-expiry-alerts';
import { useIsTablet } from '@/lib/hooks/use-is-tablet';

function useConversionModal() {
  const trial = useTrialStatus();
  const shouldShow = useConversionPromptStore(s => s.shouldShow);
  const recordShown = useConversionPromptStore(s => s.recordShown);
  const needsPrompt = trial.state === 'expired' || trial.state === 'expiring';
  const [visible, setVisible] = useState(() => shouldShow(needsPrompt));

  function dismiss() {
    recordShown();
    setVisible(false);
  }

  return { trial, visible, dismiss };
}

export default function TabLayout() {
  const theme = useTheme();
  const isTablet = useIsTablet();
  useExpiryAlerts();
  const { trial, visible: promptVisible, dismiss: dismissPrompt } = useConversionModal();

  return (
    <>
      <ConversionPrompt
        trial={trial}
        visible={promptVisible}
        onDismiss={dismissPrompt}
        onUpgrade={() => { dismissPrompt(); router.push('/paywall'); }}
      />
      <Tabs
        tabBar={isTablet ? (props) => <TabletSidebar {...props} /> : undefined}
        sceneContainerStyle={isTablet ? { marginLeft: SIDEBAR_WIDTH } : undefined}
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: '#7A6E68',
          tabBarStyle: {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.outline,
          },
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontFamily: 'Nunito_700Bold' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: 'Cupboard',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="archive" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="suggest"
          options={{
            title: 'Suggest',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="lightbulb-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="shopping-list"
          options={{
            title: 'List',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="format-list-bulleted" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
