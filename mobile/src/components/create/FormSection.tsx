import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { NeoBadge } from '~/components/neo/NeoBadge';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';

interface FormSectionProps {
  title: string;
  subtitle: string;
  badge?: string;
  children: ReactNode;
}

/** A card of the website's create form: heading, subtitle and badge above a ruled line. */
export function FormSection({ title, subtitle, badge, children }: FormSectionProps) {
  const { colors } = useTheme();

  return (
    <NeoCard style={styles.card}>
      <View style={[styles.header, { borderBottomColor: colors.ink }]}>
        <View style={styles.titles}>
          <NeoText variant="title" accessibilityRole="header">
            {title}
          </NeoText>
          <NeoText variant="caption" tone="muted">
            {subtitle}
          </NeoText>
        </View>
        {badge ? <NeoBadge label={badge} tone="ink" /> : null}
      </View>
      {children}
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  header: { gap: 8, paddingBottom: 12, borderBottomWidth: borderWidths.regular },
  titles: { gap: 2 },
});
