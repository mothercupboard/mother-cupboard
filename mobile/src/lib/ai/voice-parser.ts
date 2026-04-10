/**
 * Voice input parser — transcribes audio via OpenAI Whisper,
 * then extracts structured inventory item data via GPT-4o-mini.
 */
import { Audio } from 'expo-av';

export interface ParsedVoiceItem {
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string; // DD/MM/YYYY or ''
  expiryType: 'use_by' | 'best_before' | '';
  location: 'fridge' | 'freezer' | 'cupboard';
}

const getKey = () => process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

function todayGB(): string {
  return new Date().toLocaleDateString('en-GB');
}

export async function startVoiceRecording(): Promise<Audio.Recording> {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') throw new Error('Microphone permission denied');
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  const rec = new Audio.Recording();
  await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await rec.startAsync();
  return rec;
}

export async function stopAndTranscribe(recording: Audio.Recording): Promise<string> {
  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  const uri = recording.getURI();
  if (!uri) throw new Error('No recording URI');

  const formData = new FormData();
  formData.append('file', { uri, type: 'audio/m4a', name: 'voice.m4a' } as unknown as Blob);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getKey()}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`Whisper error ${res.status}`);
  const data = await res.json() as { text: string };
  return data.text;
}

export async function parseVoiceItem(transcript: string): Promise<ParsedVoiceItem> {
  const systemPrompt = `You extract food inventory item details from spoken natural language. Today is ${todayGB()}.
Return ONLY valid JSON with exactly these fields:
- name: string — the food item name, capitalised (e.g. "Tin of Beans", "Semi-Skimmed Milk")
- quantity: number — default 1
- unit: string — packaging unit if mentioned (e.g. "tin", "bottle", "pack", "bag", "litre") or ""
- expiryDate: string — date in DD/MM/YYYY format, or "". If only month and day mentioned (e.g. "August 27"), use the soonest future occurrence.
- expiryType: "use_by" if the phrase is "use by", "goes off", "expires" or similar; "best_before" if "best before"; "" if not clear
- location: "fridge" for dairy/fresh meat/leftovers; "freezer" for frozen items; "cupboard" for everything else

Example: "tin of beans that goes off August 27"
→ {"name":"Tin of Beans","quantity":1,"unit":"tin","expiryDate":"27/08/2026","expiryType":"use_by","location":"cupboard"}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: transcript }],
      response_format: { type: 'json_object' },
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`GPT error ${res.status}`);
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return JSON.parse(data.choices[0].message.content) as ParsedVoiceItem;
}

export interface ShoppingItem {
  name: string;
  qty?: string;
}

export async function parseShoppingVoice(transcript: string): Promise<ShoppingItem[]> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract shopping list items from natural language. Return JSON with "items" array, each having "name" (string, capitalised) and optional "qty" (string).
Examples:
"milk, bread and two tins of beans" → {"items":[{"name":"Milk"},{"name":"Bread"},{"name":"Beans","qty":"2 tins"}]}
"a bottle of olive oil and some pasta" → {"items":[{"name":"Olive Oil","qty":"1 bottle"},{"name":"Pasta"}]}`,
        },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`GPT error ${res.status}`);
  const data = await res.json() as { choices: { message: { content: string } }[] };
  const parsed = JSON.parse(data.choices[0].message.content) as { items: ShoppingItem[] };
  return Array.isArray(parsed.items) ? parsed.items : [];
}
