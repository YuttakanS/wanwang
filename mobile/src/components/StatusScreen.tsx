import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoText } from '~/components/neo/NeoText';
import { useTheme } from '~/hooks/useTheme';

interface StatusScreenProps {
  title: string;
  description?: string;
  /** Buttons such as try again or go home. */
  children?: ReactNode;
}

/** A whole-screen message for loading and for pages that cannot be shown. */
export function StatusScreen({ title, description, children }: StatusScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <NeoCard emphasis style={styles.card}>
        <NeoText variant="heading" accessibilityRole="header" accessibilityLiveRegion="polite">
          {title}
        </NeoText>
        {description ? <NeoText tone="muted">{description}</NeoText> : null}
        {children}
      </NeoCard>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  card: { padding: 20, gap: 12 },
});
