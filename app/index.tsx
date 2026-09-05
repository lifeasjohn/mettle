import { View } from 'react-native';
import { Button, Screen, Text } from '../src/ui';

export default function Placeholder() {
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="micro" tone="ember" caps>
          Foundation
        </Text>
        <Text variant="display" style={{ marginTop: 8 }}>
          Mettle
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 12 }}>
          A gym for your mind. Daily Stoic training.
        </Text>
        <Button label="Begin" style={{ marginTop: 32 }} />
      </View>
    </Screen>
  );
}
