import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { isBitSet } from '~/calendar/cellMask';
import type { SelectionStore } from '~/calendar/selectionStore';
import { fonts } from '~/constants/fonts';
import { borderWidths, ON_ACCENT } from '~/constants/theme';
import { useIsSlotSelected } from '~/hooks/useSelectionStore';
import { useTheme } from '~/hooks/useTheme';

export interface CellPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface DayCellProps {
  index: number;
  slotId: string;
  /** Left out in the hourly grid, where the row and column say what the cell is. */
  dayNumber?: number;
  label: string;
  position: CellPosition;
  store: SelectionStore;
  /** The word of the selection mask that holds this cell. */
  maskWord: SharedValue<number>;
}

export function DayCell({ index, slotId, dayNumber, label, position, store, maskWord }: DayCellProps) {
  const isSelected = useIsSlotSelected(store, slotId);
  const { accent, ink, surface } = useTheme().colors;

  // Redraws from the UI thread during a drag, without a React render per cell.
  const cellStyle = useAnimatedStyle(() => {
    const selected = isBitSet(maskWord.get(), index);
    return {
      backgroundColor: selected ? accent : surface,
      borderColor: selected ? ON_ACCENT : ink,
    };
  });
  const dayStyle = useAnimatedStyle(() => ({
    color: isBitSet(maskWord.get(), index) ? ON_ACCENT : ink,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: isBitSet(maskWord.get(), index) ? 1 : 0,
  }));

  return (
    <Animated.View
      accessible
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: isSelected }}
      onAccessibilityTap={() => store.toggle(slotId)}
      // Android has no onAccessibilityTap, and these cells have no press handler for TalkBack to use.
      {...(Platform.OS === 'android' ? { accessibilityActions: [{ name: 'activate' }], onAccessibilityAction: () => store.toggle(slotId) } : {})}
      style={[styles.cell, position, cellStyle]}
    >
      {dayNumber !== undefined && (
        <Animated.Text style={[styles.day, dayStyle]} maxFontSizeMultiplier={1.3}>
          {dayNumber}
        </Animated.Text>
      )}
      <Animated.Text style={[dayNumber === undefined ? styles.checkOnly : styles.check, checkStyle]} maxFontSizeMultiplier={1.3}>
        ✓
      </Animated.Text>
    </Animated.View>
  );
}

interface DisabledDayCellProps {
  dayNumber?: number;
  position: CellPosition;
  /** Why a day inside the event cannot be chosen, such as "FULL". Shown in the cell and read out. */
  reason?: { tag: string; label: string };
}

export function DisabledDayCell({ dayNumber, position, reason }: DisabledDayCellProps) {
  const { colors } = useTheme();
  return (
    <View
      // A past or out-of-range day says nothing. A full one is worth hearing about.
      {...(reason
        ? { accessible: true, accessibilityRole: 'checkbox' as const, accessibilityLabel: reason.label, accessibilityState: { disabled: true, checked: false } }
        : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const })}
      style={[styles.cell, position, { borderColor: colors.lineSoft, backgroundColor: colors.sunken }]}
    >
      {dayNumber !== undefined && (
        <Text style={[styles.disabledDay, { color: colors.faint }]} maxFontSizeMultiplier={1.3}>
          {dayNumber}
        </Text>
      )}
      {reason && (
        <Text style={[dayNumber === undefined ? styles.reasonOnly : styles.reason, { color: colors.muted }]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
          {reason.tag}
        </Text>
      )}
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
  checkOnly: {
    fontSize: 14,
    fontWeight: '700',
    color: ON_ACCENT,
  },
  disabledDay: {
    fontFamily: fonts.mono,
    fontSize: 14,
  },
  // Where the check mark sits in a cell that can be chosen.
  reason: {
    position: 'absolute',
    bottom: 1,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
  },
  reasonOnly: {
    fontSize: 10,
    fontWeight: '700',
  },
});
