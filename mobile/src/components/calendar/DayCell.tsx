import { StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { isCellSet } from '~/calendar/cellMask';
import type { SelectionStore } from '~/calendar/selectionStore';
import { calendarColors } from '~/constants/calendarColors';
import { useIsSlotSelected } from '~/hooks/useSelectionStore';

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

  // Redraws from the UI thread during a drag, without a React render per cell.
  const cellStyle = useAnimatedStyle(() => {
    const selected = isCellSet(maskLow.get(), maskHigh.get(), index);
    return { backgroundColor: selected ? calendarColors.accent : calendarColors.surface };
  });
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
      <Text style={styles.day} maxFontSizeMultiplier={1.3}>
        {dayNumber}
      </Text>
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
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.cell, styles.disabled, position, { width: position.size, height: position.size }]}
    >
      <Text style={styles.disabledDay} maxFontSizeMultiplier={1.3}>
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
    borderWidth: 2,
    borderColor: calendarColors.ink,
  },
  day: {
    fontSize: 14,
    fontWeight: '700',
    color: calendarColors.ink,
  },
  check: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: calendarColors.ink,
  },
  disabled: {
    borderColor: calendarColors.lineSoft,
    backgroundColor: calendarColors.sunken,
  },
  disabledDay: {
    fontSize: 14,
    color: calendarColors.faint,
  },
});
