import { StyleSheet, View } from 'react-native';
import { NeoBadge } from '~/components/neo/NeoBadge';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: 'ink' | 'accent' | 'sunken';
}

/** The website's card header: title, subtitle and badge above a ruled line. */
export function SectionHeader({ title, subtitle, badge, badgeTone = 'ink' }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { borderBottomColor: colors.ink }]}>
      <View style={styles.titles}>
        <NeoText variant="title" accessibilityRole="header">
          {title}
        </NeoText>
        {subtitle ? (
          <NeoText variant="caption" tone="muted">
            {subtitle}
          </NeoText>
        ) : null}
      </View>
      {badge ? <NeoBadge label={badge} tone={badgeTone} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8, paddingBottom: 12, borderBottomWidth: borderWidths.regular },
  titles: { gap: 2 },
});
