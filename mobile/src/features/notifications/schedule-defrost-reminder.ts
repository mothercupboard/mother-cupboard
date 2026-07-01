import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

const DEFROST_CATEGORY = 'defrost-reminder';

/**
 * Given the inventory items currently in the freezer and a recipe's ingredient
 * strings, returns the names of frozen items the recipe uses — so we can offer
 * a "take it out to defrost" reminder. Matching is deliberately loose: a frozen
 * item counts if its name appears in any ingredient line (or vice versa).
 */
export function frozenItemsUsedByRecipe(
  frozenItems: { name: string }[],
  ingredients: string[],
): string[] {
  if (!Array.isArray(ingredients) || !Array.isArray(frozenItems))
    return [];
  const ings = ingredients.map(i => String(i).toLowerCase());
  const matched = new Set<string>();
  for (const item of frozenItems) {
    const name = item.name.trim();
    if (!name)
      continue;
    const n = name.toLowerCase();
    if (ings.some(ing => ing.includes(n) || n.includes(ing.replace(/^[\d.,/\s]+(g|kg|ml|l|tbsp|tsp|cloves?|cans?|tins?|slices?|pieces?)?\s*/i, '').trim())))
      matched.add(name);
  }
  return [...matched];
}

/**
 * Schedules a single morning reminder to take frozen items out to defrost.
 * Fires at the user's preferred alert hour the next morning. Requests
 * notification permission if not already granted.
 *
 * Returns 'scheduled' on success, or 'denied' if the user declined permission.
 */
export async function scheduleDefrostReminder(
  names: string[],
  alertHour: number,
): Promise<'scheduled' | 'denied'> {
  if (names.length === 0)
    return 'scheduled';

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted')
      return 'denied';
    await Notifications.setNotificationChannelAsync('expiry-alerts', {
      name: 'Expiry Alerts',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  // Next morning at the user's preferred hour.
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    alertHour,
    0,
    0,
  );
  const seconds = Math.max(1, Math.round((target.getTime() - Date.now()) / 1000));

  const list = names.length === 1
    ? names[0]
    : names.length === 2
      ? `${names[0]} and ${names[1]}`
      : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: names.length === 1 ? `Take the ${list} out to defrost` : 'Take these out to defrost',
      body: names.length === 1
        ? 'Pop it out of the freezer this morning so it’s ready to cook later.'
        : `${list} — pop them out of the freezer this morning so they’re ready to cook later.`,
      categoryIdentifier: DEFROST_CATEGORY,
      sound: 'default',
      ...(({ channelId: 'expiry-alerts' }) as Record<string, string>),
    },
    trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
  });

  return 'scheduled';
}
