import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { NeoCard } from '~/components/neo/NeoCard';
import { Screen } from '~/components/Screen';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';

function Block({ width = '100%', height }: { width?: DimensionValue; height: number }) {
  const { colors } = useTheme();
  return <View style={{ width, height, backgroundColor: colors.lineSoft }} />;
}

/** The event screen's layout in grey, so the page does not jump when the data arrives. */
export function EventSkeleton() {
  const { t } = useI18n();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.set(withRepeat(withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Screen showBack>
      <Animated.View
        accessible
        accessibilityLabel={t('appLoading')}
        accessibilityState={{ busy: true }}
        style={[styles.page, style]}
      >
        <NeoCard emphasis>
          <Block width={80} height={22} />
          <Block width="70%" height={32} />
          <Block height={16} />
          <Block width="60%" height={16} />
          <Block width={140} height={48} />
        </NeoCard>
        <NeoCard>
          <View style={styles.row}>
            <Block width={120} height={40} />
            <Block width={120} height={40} />
          </View>
          <View style={styles.grid}>
            {Array.from({ length: 28 }, (_, i) => (
              <View key={i} style={styles.cell}>
                <Block height={44} />
              </View>
            ))}
          </View>
        </NeoCard>
        <NeoCard>
          <Block width="50%" height={24} />
          <Block height={90} />
        </NeoCard>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 16 },
  row: { flexDirection: 'row', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: '13%', flexGrow: 1 },
});
