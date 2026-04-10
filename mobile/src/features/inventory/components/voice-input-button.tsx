import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { parseVoiceItem, startVoiceRecording, stopAndTranscribe } from '@/lib/ai/voice-parser';
import type { ParsedVoiceItem } from '@/lib/ai/voice-parser';

interface Props {
  onParsed: (item: ParsedVoiceItem) => void;
}

type State = 'idle' | 'recording' | 'processing' | 'error';

export function VoiceInputButton({ onParsed }: Props) {
  const [uiState, setUiState] = useState<State>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);

  const handlePressIn = async () => {
    try {
      const rec = await startVoiceRecording();
      recordingRef.current = rec;
      setUiState('recording');
    } catch {
      setUiState('error');
      setTimeout(() => setUiState('idle'), 2000);
    }
  };

  const handlePressOut = async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;
    try {
      setUiState('processing');
      const transcript = await stopAndTranscribe(rec);
      const parsed = await parseVoiceItem(transcript);
      onParsed(parsed);
      setUiState('idle');
    } catch {
      setUiState('error');
      setTimeout(() => setUiState('idle'), 2000);
    }
  };

  const iconName =
    uiState === 'error' ? 'microphone-off' : 'microphone';

  const label =
    uiState === 'idle' ? 'Hold to speak' :
    uiState === 'recording' ? 'Listening…' :
    uiState === 'processing' ? 'Processing…' :
    'Try again';

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={uiState === 'processing'}
        style={[
          styles.button,
          uiState === 'recording' && styles.buttonActive,
          uiState === 'error' && styles.buttonError,
        ]}
        accessibilityLabel="Hold to add item by voice"
        accessibilityRole="button"
      >
        {uiState === 'processing' ? (
          <ActivityIndicator color={WarmHearthColors.background} size="small" />
        ) : (
          <MaterialCommunityIcons name={iconName} size={26} color={WarmHearthColors.background} />
        )}
      </Pressable>
      <Text variant="bodySmall" style={styles.hint}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  button: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: WarmHearthColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonActive: {
    backgroundColor: '#B03A2E',
    transform: [{ scale: 1.08 }],
  },
  buttonError: {
    backgroundColor: WarmHearthColors.expiryUrgent,
  },
  hint: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
});


