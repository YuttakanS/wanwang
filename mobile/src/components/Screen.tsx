import { useRouter } from 'expo-router';
import type { ComponentRef, ReactNode, Ref } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths } from '~/constants/theme';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';

export type ScreenScrollView = ComponentRef<typeof ScrollView>;

interface ScreenProps {
  children: ReactNode;
  scrollRef?: Ref<ScreenScrollView>;
  scrollEnabled?: boolean;
  showBack?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/** A scrolling page. Uses gesture-handler's ScrollView so the calendar's gestures can work with it. */
export function Screen({ children, scrollRef, scrollEnabled = true, showBack = false, refreshing = false, onRefresh }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  return (
    <ScrollView
      ref={scrollRef}
      scrollEnabled={scrollEnabled}
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} /> : undefined}
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
    >
      {showBack && (
        // The website's navbar, with going back in place of the language and theme controls.
        <View style={[styles.bar, { borderBottomColor: colors.ink }]}>
          <NeoButton
            label={t('backBtn')}
            variant="secondary"
            size="sm"
            // A deep link can open a screen with nothing behind it.
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <View style={[styles.logo, { backgroundColor: colors.ink }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <NeoText variant="heading" style={{ color: colors.surface }}>
              ว
            </NeoText>
          </View>
        </View>
      )}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16 },
  // Cancels the padding, so the line under the bar runs edge to edge.
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 16,
    minHeight: 64,
    borderBottomWidth: borderWidths.regular,
  },
  logo: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
