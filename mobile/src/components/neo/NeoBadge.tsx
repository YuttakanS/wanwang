import { StyleSheet, View } from 'react-native';
import { borderWidths, ON_ACCENT } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';
import { NeoText } from './NeoText';

type NeoBadgeTone = 'surface' | 'accent' | 'ink';

interface NeoBadgeProps {
  label: string;
  tone?: NeoBadgeTone;
}

export function NeoBadge({ label, tone = 'surface' }: NeoBadgeProps) {
  const { colors } = useTheme();
  const backgroundColor = { surface: colors.surface, accent: colors.accent, ink: colors.ink }[tone];
  const borderColor = tone === 'accent' ? ON_ACCENT : colors.ink;
  const textColor = { surface: colors.ink, accent: ON_ACCENT, ink: colors.onInkAccent }[tone];

  return (
    <View style={[styles.badge, { backgroundColor, borderColor }]}>
      <NeoText variant="caption" style={{ color: textColor }}>
        {label}
      </NeoText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    borderWidth: borderWidths.thin,
  },
});
