import { StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { isCellSet } from '~/calendar/cellMask';
import type { SelectionStore } from '~/calendar/selectionStore';
import { fonts } from '~/constants/fonts';
import { borderWidths, ON_ACCENT } from '~/constants/theme';
import { useIsSlotSelected } from '~/hooks/useSelectionStore';
import { useTheme } from '~/hooks/useTheme';

interface Position {
  left: number;
  top: number;
  size: number;
}

interface DayCellProps {
  index: number;
  slotId: string;
  dayNumber: number;
  label: string;
  position: Position;
  store: SelectionStore;
  maskLow: SharedValue<number>;
  maskHigh: SharedValue<number>;
}

export function DayCell({ index, slotId, dayNumber, label, position, store, maskLow, maskHigh }: DayCellProps) {
  const isSelected = useIsSlotSelected(store, slotId);
  const { accent, ink, surface } = useTheme().colors;

  // Redraws from the UI thread during a drag, without a React render per cell.
  const cellStyle = useAnimatedStyle(() => {
    const selected = isCellSet(maskLow.get(), maskHigh.get(), index);
    return {
      backgroundColor: selected ? accent : surface,
      borderColor: selected ? ON_ACCENT : ink,
    };
  });
  const dayStyle = useAnimatedStyle(() => ({
    color: isCellSet(maskLow.get(), maskHigh.get(), index) ? ON_ACCENT : ink,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: isCellSet(maskLow.get(), maskHigh.get(), index) ? 1 : 0,
  }));

  return (
    <Animated.View
      accessible
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: isSelected }}
      onAccessibilityTap={() => store.toggle(slotId)}
      style={[styles.cell, position, { width: position.size, height: position.size }, cellStyle]}
    >
      <Animated.Text style={[styles.day, dayStyle]} maxFontSizeMultiplier={1.3}>
        {dayNumber}
      </Animated.Text>
      <Animated.Text style={[styles.check, checkStyle]} maxFontSizeMultiplier={1.3}>
        ✓
      </Animated.Text>
    </Animated.View>
  );
}

interface DisabledDayCellProps {
  dayNumber: number;
  position: Position;
}

export function DisabledDayCell({ dayNumber, position }: DisabledDayCellProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.cell,
        position,
        { width: position.size, height: position.size, borderColor: colors.lineSoft, backgroundColor: colors.sunken },
      ]}
    >
      <Text style={[styles.disabledDay, { color: colors.faint }]} maxFontSizeMultiplier={1.3}>
        {dayNumber}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borderWidths.thin,
  },
  day: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
  },
  // Out of the flow, so the hidden mark does not push the number above the disabled cells' numbers.
  check: {
    position: 'absolute',
    bottom: 1,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: ON_ACCENT,
  },
  disabledDay: {
    fontFamily: fonts.mono,
    fontSize: 14,
  },
});
