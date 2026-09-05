import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { FREE_SPAR_ALLOWANCE } from '../src/domain';
import { PATH_NOUN } from '../src/features/onboarding/steps';
import { cancelReminders, requestPermission, scheduleQuenchReminder } from '../src/lib/notifications';
import { useStreak } from '../src/state/hooks';
import { useMettle } from '../src/state/store';
import { palette, spacing } from '../src/theme/tokens';
import { Button, Card, Chip, Screen, Text } from '../src/ui';

const TIMES = ['20:00', '21:00', '22:00', '23:00'];
const label = (t: string) => {
  const h = Number(t.split(':')[0]);
  return `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? 'pm' : 'am'}`;
};

export default function Settings() {
  const router = useRouter();
  const profile = useMettle((s) => s.profile);
  const entitlement = useMettle((s) => s.entitlement);
  const saveProfile = useMettle((s) => s.saveProfile);
  const reset = useMettle((s) => s.reset);
  const streak = useStreak();
  const [notifications, setNotifications] = useState(true);

  const setTime = async (time: string) => {
    if (!profile) return;
    await saveProfile({ ...profile, notificationTime: time });
    if (notifications) await scheduleQuenchReminder(time, streak.current);
  };

  const toggleNotifications = async () => {
    if (notifications) {
      await cancelReminders();
      setNotifications(false);
      return;
    }
    const granted = await requestPermission();
    setNotifications(granted);
    if (granted && profile) await scheduleQuenchReminder(profile.notificationTime, streak.current);
  };

  const confirmReset = () => {
    const wipe = () => void reset().then(() => router.replace('/onboarding'));
    if (Platform.OS === 'web') {
      wipe();
      return;
    }
    Alert.alert('Erase everything?', 'Your streak, spars and Quench history will be deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: wipe },
    ]);
  };

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Text variant="body" tone="faint">
            Back
          </Text>
        </Pressable>
        <Text variant="display" style={{ marginTop: spacing.sm }}>
          Settings
        </Text>
      </View>

      <Card style={styles.block}>
        <Text variant="micro" tone="faint" caps>
          Training
        </Text>
        <Text variant="bodyStrong" style={{ marginTop: spacing.sm }}>
          Tempering {profile ? PATH_NOUN[profile.strugglePath] : 'nothing yet'}
        </Text>
        <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
          {profile?.minutesCommitment ?? 5} minutes a day. Longest streak {streak.longest}.
        </Text>
      </Card>

      <Card style={styles.block}>
        <Text variant="micro" tone="faint" caps>
          Evening reminder
        </Text>
        <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
          One notification a night for the Quench. Nothing else, ever.
        </Text>
        <View style={styles.chips}>
          {TIMES.map((t) => (
            <Chip
              key={t}
              label={label(t)}
              selected={profile?.notificationTime === t}
              onPress={() => void setTime(t)}
            />
          ))}
        </View>
        <Button
          label={notifications ? 'Turn reminders off' : 'Turn reminders on'}
          kind="secondary"
          style={{ marginTop: spacing.base }}
          onPress={() => void toggleNotifications()}
        />
      </Card>

      <Card style={styles.block}>
        <Text variant="micro" tone="faint" caps>
          Subscription
        </Text>
        <Text variant="bodyStrong" style={{ marginTop: spacing.sm }}>
          {entitlement.status === 'active' ? 'Active' : 'Free'}
        </Text>
        <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
          {entitlement.status === 'active'
            ? 'Unlimited sparring.'
            : `${Math.max(0, FREE_SPAR_ALLOWANCE - entitlement.sparsUsed)} free spars left. The lessons and the Quench stay free either way.`}
        </Text>
        {entitlement.status === 'free' ? (
          <Button
            label="See plans"
            kind="secondary"
            style={{ marginTop: spacing.base }}
            onPress={() => router.push('/paywall')}
          />
        ) : null}
      </Card>

      <Card style={styles.block}>
        <Text variant="micro" tone="faint" caps>
          Your data
        </Text>
        <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
          What you write in the Arena and the Quench is used to score and to show
          you your patterns. It is never used in analytics.
        </Text>
        <Button
          label="Erase everything"
          kind="danger"
          style={{ marginTop: spacing.base }}
          onPress={confirmReset}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: spacing.base, paddingBottom: spacing.lg },
  block: { marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.base },
});
