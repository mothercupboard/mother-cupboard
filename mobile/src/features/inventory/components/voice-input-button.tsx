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

type State = 'idle' | 'recording' | 'processing' | 'error' | 'tooshort';

export function VoiceInputButton({ onParsed }: Props) {
  const [uiState, setUiState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startTimeRef = useRef<number>(0);

  const handlePressIn = async () => {
    try {
      const rec = await startVoiceRecording();
      recordingRef.current = rec;
      startTimeRef.current = Date.now();
      setUiState('recording');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Voice] Failed to start recording:', msg);
      setErrorMsg(msg);
      setUiState('error');
      setTimeout(() => { setUiState('idle'); setErrorMsg(''); }, 3000);
    }
  };

  const handlePressOut = async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;

    const heldMs = Date.now() - startTimeRef.current;
    if (heldMs < 600) {
      // Too short — user tapped rather than held
      try { await rec.stopAndUnloadAsync(); } catch {}
      setUiState('tooshort');
      setTimeout(() => setUiState('idle'), 2000);
      return;
    }

    try {
      setUiState('processing');
      const transcript = await stopAndTranscribe(rec);
      console.log('[Voice] Transcript:', transcript);
      const parsed = await parseVoiceItem(transcript);
      console.log('[Voice] Parsed:', JSON.stringify(parsed));
      onParsed(parsed);
      setUiState('idle');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Voice] Processing error:', msg);
      setErrorMsg(msg);
      setUiState('error');
      setTimeout(() => { setUiState('idle'); setErrorMsg(''); }, 3000);
    }
  };

  const iconName =
    uiState === 'error' ? 'microphone-off' :
    uiState === 'tooshort' ? 'microphone-outline' :
    'microphone';

  const label =
    uiState === 'idle' ? 'Hold to speak' :
    uiState === 'recording' ? 'Listening…' :
    uiState === 'processing' ? 'Processing…' :
    uiState === 'tooshort' ? 'Hold longer' :
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
      {errorMsg ? <Text variant="bodySmall" style={styles.errorDetail}>{errorMsg}</Text> : null}
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
  errorDetail: {
    color: WarmHearthColors.expiryUrgent,
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    maxWidth: 220,
    textAlign: 'center',
  },
});


