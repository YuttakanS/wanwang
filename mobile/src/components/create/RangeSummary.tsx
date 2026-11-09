import { StyleSheet, View } from 'react-native';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';

/** The website's range summary: a box with a yellow stripe on its left edge. */
export function RangeSummary({ label, text }: { label: string; text: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.box, { borderColor: colors.ink, backgroundColor: colors.surface }]} accessibilityLiveRegion="polite">
      <View style={[styles.stripe, { backgroundColor: colors.accent }]} />
      <NeoText variant="caption" style={styles.text}>
        {label ? `${label} ` : ''}
        <NeoText variant="caption" tone="muted">
          {text}
        </NeoText>
      </NeoText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', borderWidth: borderWidths.thin },
  stripe: { width: 6 },
  text: { flex: 1, paddingHorizontal: 12, paddingVertical: 6 },
});
