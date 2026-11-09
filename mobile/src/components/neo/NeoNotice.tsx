import { StyleSheet } from 'react-native';
import { NeoCard } from './NeoCard';
import { NeoText } from './NeoText';

interface NeoNoticeProps {
  message: string;
  /** Accent is for errors, sunken is for plain information. */
  tone?: 'accent' | 'sunken';
}

export function NeoNotice({ message, tone = 'accent' }: NeoNoticeProps) {
  return (
    <NeoCard tone={tone} style={styles.notice} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <NeoText variant="caption" tone={tone === 'accent' ? 'onAccent' : 'ink'}>
        {message}
      </NeoText>
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  notice: { padding: 12 },
});
