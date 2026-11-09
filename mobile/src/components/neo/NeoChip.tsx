import { Pressable, StyleSheet } from 'react-native';
import { borderWidths } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';
import { NeoText } from './NeoText';

interface NeoChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}

/** A small choice, such as a category, tab or shortcut. Selected is the website's ink background. */
export function NeoChip({ label, selected = false, disabled = false, accessibilityLabel, onPress }: NeoChipProps) {
  const { colors } = useTheme();
  const borderColor = disabled ? colors.lineSoft : colors.ink;
  const color = selected ? colors.surface : disabled ? colors.faint : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor, backgroundColor: selected ? colors.ink : pressed ? colors.sunken : colors.surface },
      ]}
    >
      <NeoText variant="caption" style={{ color }}>
        {label}
      </NeoText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borderWidths.thin,
  },
});
