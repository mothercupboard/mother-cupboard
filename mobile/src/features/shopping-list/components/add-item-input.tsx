import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { parseShoppingVoice, startVoiceRecording, stopAndTranscribe } from '@/lib/ai/voice-parser';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useShoppingListStore } from '@/features/shopping-list/shopping-list-store';

/**
 * Inline input row at the top of the shopping list. The user types an
 * item name and taps the add button (or presses Enter). Supports an
 * optional quantity suffix separated by a comma: "Milk, 2 pints".
 */
export function AddItemInput() {
  const [text, setText] = useState('');
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const addItem = useShoppingListStore(s => s.addItem);

  async function handleVoicePressIn() {
    try {
      const rec = await startVoiceRecording();
      recordingRef.current = rec;
      setVoiceState('recording');
    } catch {
      setVoiceState('idle');
    }
  }

  async function handleVoicePressOut() {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;
    try {
      setVoiceState('processing');
      const transcript = await stopAndTranscribe(rec);
      const items = await parseShoppingVoice(transcript);
      items.forEach(item => addItem(item.name, item.qty));
      setVoiceState('idle');
    } catch {
      setVoiceState('idle');
    }
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed)
      return;

    // Support "name, quantity" shorthand
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx > 0) {
      const name = trimmed.slice(0, commaIdx).trim();
      const qty = trimmed.slice(commaIdx + 1).trim();
      addItem(name, qty);
    }
    else {
      addItem(trimmed);
    }

    setText('');
  }

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        placeholder="Add item (e.g. Milk, 2 pints)"
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        style={styles.input}
        dense
        accessibilityLabel="Add shopping list item"
        accessibilityHint="Type item name, optionally followed by comma and quantity"
      />
      <IconButton
        icon="plus-circle"
        iconColor={WarmHearthColors.shoppingList}
        size={28}
        onPress={handleSubmit}
        disabled={!text.trim() || voiceState !== 'idle'}
        accessibilityLabel="Add item"
      />
      <Pressable
        onPressIn={handleVoicePressIn}
        onPressOut={handleVoicePressOut}
        disabled={voiceState === 'processing'}
        style={[styles.micButton, voiceState === 'recording' && styles.micActive]}
        accessibilityLabel="Hold to add items by voice"
      >
        {voiceState === 'processing'
          ? <ActivityIndicator size="small" color={WarmHearthColors.primary} />
          : <MaterialCommunityIcons
              name="microphone"
              size={22}
              color={voiceState === 'recording' ? '#FFFFFF' : WarmHearthColors.primary}
            />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    backgroundColor: WarmHearthColors.surface,
    flex: 1,
  },
  micButton: {
    alignItems: 'center',
    backgroundColor: WarmHearthColors.background,
    borderColor: WarmHearthColors.primary,
    borderRadius: 20,
    borderWidth: 1.5,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  micActive: {
    backgroundColor: WarmHearthColors.primary,
  },
});
