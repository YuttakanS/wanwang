import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths } from '~/constants/theme';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';

// The website's .motion-highlight: the yellow lands just after the headline.
// Only opacity and transform, because an `entering` Keyframe here took the box out of the layout on the web build.
function useHighlightPop() {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    progress.set(withDelay(160, withTiming(1, { duration: 280, easing: Easing.out(Easing.back(1.5)) })));
  }, [progress, reducedMotion]);

  return useAnimatedStyle(() => {
    const value = progress.get();
    return { opacity: Math.min(value, 1), transform: [{ scale: 0.94 + value * 0.06 }] };
  });
}

export function HomeHero() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const highlightStyle = useHighlightPop();

  return (
    <View style={[styles.hero, { borderBottomColor: colors.ink }]}>
      <View style={[styles.badge, { backgroundColor: colors.ink }]}>
        <NeoText variant="caption" style={{ color: colors.onInkAccent }}>
          {t('heroBadge')}
        </NeoText>
      </View>

      <View accessible accessibilityRole="header">
        <NeoText variant="display">{t('heroHeadline1')}</NeoText>
        <Animated.View style={[styles.highlight, { backgroundColor: colors.accent }, highlightStyle]}>
          <NeoText variant="display" tone="onAccent">
            {t('heroHeadline2')}
          </NeoText>
        </Animated.View>
      </View>

      <NeoText>{t('heroDescription')}</NeoText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 12, paddingTop: 8, paddingBottom: 24, borderBottomWidth: borderWidths.thick },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2 },
  highlight: { alignSelf: 'flex-start', paddingHorizontal: 4 },
});
