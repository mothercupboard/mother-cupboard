import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';

type FeatureTipProps = {
  icon: string;
  title: string;
  body: string;
  onDismiss: () => void;
};

/**
 * A dismissible tip card shown the first time a user visits a feature
 * tab. Warm, friendly tone with a close button. Renders nothing after
 * dismiss — the parent checks the onboarding store flag.
 */
export function FeatureTip({ icon, title, body, onDismiss }: FeatureTipProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name={icon as 'lightbulb-outline'} size={22} color={WarmHearthColors.primary} />
        <Text variant="titleSmall" style={styles.title}>{title}</Text>
        <Pressable
          onPress={onDismiss}
          hitSlop={16}
          accessibilityLabel="Dismiss tip"
          accessibilityRole="button"
          style={styles.closeButton}
        >
          <MaterialCommunityIcons name="close" size={18} color={WarmHearthColors.textSecondary} />
        </Pressable>
      </View>
      <Text variant="bodyMedium" style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF5EE',
    borderColor: '#FFD9C5',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 14,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: WarmHearthColors.textPrimary,
    flex: 1,
    fontFamily: 'Nunito_700Bold',
  },
  closeButton: {
    padding: 6,
  },
  body: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
  },
});
