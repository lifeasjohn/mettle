import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * One notification a night, for the Quench. Nothing else, ever.
 *
 * Permission is requested after the first lesson completes rather than at
 * launch, because asking before the app has done anything for you is how you
 * get a permanent denial.
 *
 * Copy rotates and references the streak, since "your 6 day streak ends at
 * midnight" is a materially different message from a generic nudge.
 */

const CHANNEL = 'quench';

export const QUENCH_COPY = [
  { title: 'The Quench', body: 'Sixty seconds. What held, what ran you.' },
  { title: 'Close the day', body: 'Look at the tape. It is the part most people skip.' },
  { title: 'The Quench', body: 'Bad day? Those are the ones with something in them.' },
  { title: 'One minute', body: 'Set it, live it, review it. You are on the last step.' },
];

export function copyForStreak(streak: number, index = Math.floor(Math.random() * QUENCH_COPY.length)) {
  if (streak >= 2) {
    return {
      title: `${streak} days`,
      body: 'One review keeps it alive. It takes a minute.',
    };
  }
  return QUENCH_COPY[index % QUENCH_COPY.length]!;
}

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Replaces any existing schedule. `time` is "HH:mm" in the device's own
 * timezone, which is what the daily trigger uses.
 */
export async function scheduleQuenchReminder(time: string, streak: number): Promise<void> {
  if (Platform.OS === 'web') return;

  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'The Quench',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const copy = copyForStreak(streak);
  await Notifications.scheduleNotificationAsync({
    content: { title: copy.title, body: copy.body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? CHANNEL : undefined,
    },
  });
}

export async function cancelReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
