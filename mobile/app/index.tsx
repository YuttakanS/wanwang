import { StyleSheet, Text, View } from 'react-native';
import { formatLocalizedDate } from '@/lib/timeUtils';
import { translations } from '@/lib/translations';
import { apiUrl } from '~/constants/config';

// Temporary screen that proves the code shared with the website runs on a device.
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{translations.th.appName}</Text>
      <Text>{formatLocalizedDate('2026-12-31', 'th', 'chip')}</Text>
      <Text>{apiUrl}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF' },
  title: { fontSize: 32, fontWeight: '700', color: '#000000' },
});
