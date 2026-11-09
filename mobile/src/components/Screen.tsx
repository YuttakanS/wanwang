import { useRouter } from 'expo-router';
import type { ComponentRef, ReactNode, Ref } from 'react';
import { RefreshControl, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NeoButton } from '~/components/neo/NeoButton';
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
        <NeoButton
          label={t('backBtn')}
          variant="secondary"
          size="sm"
          // A deep link can open a screen with nothing behind it.
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      )}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16 },
});
