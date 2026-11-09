import { Pressable, StyleSheet, View } from 'react-native';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths, ON_ACCENT } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';

interface Choice<T> {
  value: T;
  label: string;
}

interface ChoicesProps<T> {
  options: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

/**
 * The website's choice grid: two columns of boxes, the chosen one in ink with yellow text.
 * Used for categories and range shortcuts.
 */
export function ChoiceGrid<T extends string | number>({ options, value, onChange, label }: ChoicesProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={styles.block}>
      {label ? <NeoText variant="label">{label}</NeoText> : null}
      <View style={styles.grid}>
        {options.map(option => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.cell,
                { borderColor: colors.ink, backgroundColor: selected ? colors.ink : pressed ? colors.sunken : colors.surface },
              ]}
            >
              <NeoText variant="caption" style={{ color: selected ? colors.onInkAccent : colors.ink }}>
                {option.label}
              </NeoText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** The website's segmented control: one bordered row, the chosen part in yellow. */
export function Segmented<T extends string | number>({ options, value, onChange, label }: ChoicesProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={styles.block}>
      {label ? <NeoText variant="label">{label}</NeoText> : null}
      <View accessibilityRole="radiogroup" style={[styles.row, { borderColor: colors.ink }]}>
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.segment,
                { backgroundColor: selected ? colors.accent : pressed ? colors.sunken : colors.surface },
                index > 0 && { borderLeftWidth: borderWidths.thin, borderLeftColor: colors.ink },
              ]}
            >
              <NeoText variant="label" style={{ color: selected ? ON_ACCENT : colors.ink, textAlign: 'center' }}>
                {option.label}
              </NeoText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Two per row: under half the width, then both grow to fill it, gap included.
  cell: { flexBasis: '40%', flexGrow: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: borderWidths.thin },
  row: { flexDirection: 'row', borderWidth: borderWidths.thin },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
