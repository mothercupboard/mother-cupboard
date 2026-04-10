import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';

type Props = {
  isPending: boolean;
  onSurpriseMe: () => void;
  onTweakAndRetry: () => void;
};

/**
 * Footer shown below meal suggestion results. Offers two paths when the
 * user doesn't fancy any of the current suggestions:
 *
 * 1. **Surprise me** — regenerates with an AI hint to avoid repeating
 *    the current titles (different results, same preferences).
 * 2. **Tweak & retry** — returns to the preference controls so the user
 *    can adjust adventurousness, servings, or mood before regenerating.
 */
export function NoneOfTheseFooter({ isPending, onSurpriseMe, onTweakAndRetry }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="emoticon-neutral-outline" size={20} color={WarmHearthColors.textSecondary} />
        <Text variant="titleSmall" style={styles.heading}>None of these?</Text>
      </View>

      <View style={styles.buttonRow}>
        <Button
          mode="contained"
          onPress={onSurpriseMe}
          loading={isPending}
          disabled={isPending}
          icon="dice-multiple-outline"
          style={styles.button}
          labelStyle={styles.buttonLabel}
          compact
        >
          Surprise me
        </Button>

        <Button
          mode="outlined"
          onPress={onTweakAndRetry}
          disabled={isPending}
          icon="tune-variant"
          style={styles.button}
          labelStyle={styles.tweakLabel}
          compact
        >
          Tweak & retry
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WarmHearthColors.surface,
    borderRadius: 12,
    elevation: 1,
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    shadowColor: '#D4673A',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heading: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    borderRadius: 12,
    flex: 1,
  },
  buttonLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
  },
  tweakLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
  },
});
