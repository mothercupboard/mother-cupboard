import type { Database } from '@nozbe/watermelondb';
import type { NotificationPreferences } from '@/features/notifications/notification-store';
import type { InventoryItem } from '@/lib/database/models/inventory-item';
import { Q } from '@nozbe/watermelondb';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

const ALERT_CATEGORY = 'expiry-alert';

/**
 * Queries the local database for items approaching expiry, cancels any
 * previously-scheduled expiry notifications, then schedules fresh ones
 * on the "expiry-alerts" channel.
 *
 * Covers two tiers:
 *  • **use_by** (urgent) — today / tomorrow → immediate or morning alert
 *  • **best_before** (gentle) — within 3 days → single morning+1h alert
 *
 * Respects the user's notification preferences (per-category toggles and
 * preferred alert hour). Designed to be called on every app-foreground and
 * after sync — it is idempotent (cancel-all → reschedule).
 */
export async function scheduleExpiryAlerts(
  db: Database,
  prefs: NotificationPreferences,
): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted')
    return;

  // ── 1. Cancel previously-scheduled expiry alerts ────────────────────────
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => n.content.categoryIdentifier === ALERT_CATEGORY)
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const now = new Date();
  const ctx: ScheduleCtx = {
    db,
    now,
    startOfToday: new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
    alertHour: prefs.alertHour,
  };

  const tasks: Promise<void>[] = [];
  if (prefs.useByAlerts)
    tasks.push(scheduleUseByAlerts(ctx));
  if (prefs.bestBeforeAlerts)
    tasks.push(scheduleBestBeforeAlerts(ctx));
  await Promise.all(tasks);
}

type ScheduleCtx = {
  db: Database;
  now: Date;
  startOfToday: number;
  alertHour: number;
};

// ─── Use-by: urgent (today / tomorrow) ────────────────────────────────────

async function scheduleUseByAlerts(ctx: ScheduleCtx): Promise<void> {
  const { db, now, startOfToday, alertHour } = ctx;
  const endOfTomorrow = startOfToday + 2 * 86_400_000;

  const items = await db
    .get<InventoryItem>('inventory_items')
    .query(
      Q.where('is_deleted', false),
      Q.where('expiry_type', 'use_by'),
      Q.where('expiry_date', Q.notEq(null)),
      Q.where('expiry_date', Q.gte(startOfToday)),
      Q.where('expiry_date', Q.lt(endOfTomorrow)),
    )
    .fetch();

  if (items.length === 0)
    return;

  const endOfToday = startOfToday + 86_400_000;
  const todayItems = items.filter(i => i.expiryDate! < endOfToday);
  const tomorrowItems = items.filter(i => i.expiryDate! >= endOfToday);

  if (todayItems.length > 0) {
    await scheduleAlert(
      todayItems.length === 1
        ? `${todayItems[0].name} — best used today`
        : `${todayItems.length} items to use today`,
      todayItems.length === 1
        ? 'A good day to cook with this — check your suggestions for ideas.'
        : todayItems.map(i => i.name).join(', '),
      null, // fire immediately
    );
  }

  if (tomorrowItems.length > 0) {
    const alertTimeTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      alertHour,
      0,
      0,
    );
    const secondsUntil = Math.max(
      1,
      Math.round((alertTimeTomorrow.getTime() - Date.now()) / 1000),
    );

    await scheduleAlert(
      tomorrowItems.length === 1
        ? `${tomorrowItems[0].name} — best used by tomorrow`
        : `${tomorrowItems.length} items to use by tomorrow`,
      tomorrowItems.length === 1
        ? 'Worth planning a meal around this one.'
        : tomorrowItems.map(i => i.name).join(', '),
      secondsUntil,
    );
  }
}

// ─── Best-before: gentle (within 3 days) ──────────────────────────────────

async function scheduleBestBeforeAlerts(ctx: ScheduleCtx): Promise<void> {
  const { db, now, startOfToday, alertHour } = ctx;
  const endOfThreeDays = startOfToday + 3 * 86_400_000;

  const items = await db
    .get<InventoryItem>('inventory_items')
    .query(
      Q.where('is_deleted', false),
      Q.where('expiry_type', 'best_before'),
      Q.where('expiry_date', Q.notEq(null)),
      Q.where('expiry_date', Q.gt(startOfToday)),
      Q.where('expiry_date', Q.lte(endOfThreeDays)),
    )
    .fetch();

  if (items.length === 0)
    return;

  // Schedule a single gentle nudge one hour after the use-by alert time
  // so notifications don't stack at the same moment.
  const bbAlertTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    alertHour + 1,
    0,
    0,
  );
  const secondsUntil = Math.max(
    1,
    Math.round((bbAlertTime.getTime() - Date.now()) / 1000),
  );

  await scheduleAlert(
    items.length === 1
      ? `${items[0].name} — best before soon`
      : `${items.length} items are best before soon`,
    items.length === 1
      ? 'Still fine to eat — just tastes best if you use it in the next few days.'
      : `${items.map(i => i.name).join(', ')} — still fine, but best used soon.`,
    secondsUntil,
  );
}

async function scheduleAlert(
  title: string,
  body: string,
  seconds: number | null,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      categoryIdentifier: ALERT_CATEGORY,
      sound: 'default',
      ...(({ channelId: 'expiry-alerts' }) as Record<string, string>),
    },
    trigger: seconds === null
      ? null
      : { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
  });
}
