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

const getKey = () => {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
  if (!key) console.error('[Voice] EXPO_PUBLIC_OPENAI_API_KEY is empty — check EAS env vars');
  return key;
};

function todayGB(): string {
  return new Date().toLocaleDateString('en-GB');
}

export async function startVoiceRecording(): Promise<Audio.Recording> {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') throw new Error('Microphone permission denied');
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

  // createAsync handles setup atomically — avoids "recorder not prepared" race conditions
  const { recording } = await Audio.Recording.createAsync({
    isMeteringEnabled: false,
    android: {
      extension: '.m4a',
      outputFormat: 2,  // MPEG_4
      audioEncoder: 3,  // AAC
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: 127,    // MAX
      outputFormat: 'aac ', // kAudioFormatMPEG4AAC — trailing space is intentional
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
  });
  return recording;
}

export async function stopAndTranscribe(recording: Audio.Recording): Promise<string> {
  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  const uri = recording.getURI();
  if (!uri) throw new Error('No recording URI');

  const formData = new FormData();
  formData.append('file', { uri, type: 'audio/mp4', name: 'voice.m4a' } as unknown as Blob);
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

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit: string;
  location: 'fridge' | 'freezer' | 'cupboard' | 'unknown';
  expiryType: 'use_by' | 'best_before' | '';
}

/**
 * Sends a base64-encoded receipt photo to GPT-4o vision and returns
 * a list of food items with suggested storage locations.
 */
export async function parseReceiptImage(base64Image: string): Promise<ReceiptItem[]> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a UK grocery receipt parser. Extract only food and drink items from this receipt.
Return JSON with "items" array. Each item:
- name: string — food item name, properly capitalised (e.g. "Semi-Skimmed Milk", "Baked Beans")
- quantity: number — quantity purchased (default 1)
- unit: string — packaging unit if clear (e.g. "tin", "bottle", "pack", "bag") or ""
- location: "fridge" for dairy/fresh meat/veg/deli; "freezer" for frozen items; "cupboard" for dry/canned/ambient goods; "unknown" if genuinely unsure
- expiryType: "use_by" for fresh items (meat, fish, ready meals, fresh dairy); "best_before" for dry goods and long-life; "" for most non-perishables

Skip non-food items, alcohol (unless user seems to want it), toiletries, household products, and skip totals/tax lines.
Be conservative — only include items you can clearly identify as food/drink.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    }),
  });
  if (!res.ok) throw new Error(`GPT vision error ${res.status}`);
  const data = await res.json() as { choices: { message: { content: string } }[] };
  const parsed = JSON.parse(data.choices[0].message.content) as { items: ReceiptItem[] };
  return Array.isArray(parsed.items) ? parsed.items : [];
}
