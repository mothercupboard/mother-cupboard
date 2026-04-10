import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';

/**
 * Shown on the suggest screen when the device is offline.
 * Informs the user that generation requires a connection but
 * saved meals are still available.
 */
export function OfflineBanner() {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <MaterialCommunityIcons name="wifi-off" size={18} color={WarmHearthColors.expiryWarning} importantForAccessibility="no" />
      <Text variant="bodySmall" style={styles.text}>
        {'You\u2019re offline — saved meals are still available, but generating new suggestions requires a connection.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderBottomColor: WarmHearthColors.expiryWarning,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    color: WarmHearthColors.textSecondary,
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
});
