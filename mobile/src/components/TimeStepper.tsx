import { StyleSheet, View } from 'react-native';
import { NeoChip } from '~/components/neo/NeoChip';
import { NeoText } from '~/components/neo/NeoText';
import { useI18n } from '~/hooks/useI18n';

interface TimeStepperProps {
  label: string;
  options: string[];
  value: string;
  textFor?: (option: string) => string;
  onChange: (option: string) => void;
}

/** Steps through a short list of times, so the app needs no native picker. */
export function TimeStepper({ label, options, value, textFor, onChange }: TimeStepperProps) {
  const { t } = useI18n();
  const index = options.indexOf(value);

  return (
    <View style={styles.row}>
      <NeoText variant="label" style={styles.label}>
        {label}
      </NeoText>
      <NeoChip label="<" accessibilityLabel={t('earlierTimeLabel', { label })} disabled={index <= 0} onPress={() => onChange(options[index - 1])} />
      <NeoText variant="monoBold" style={styles.value} accessibilityLiveRegion="polite">
        {textFor ? textFor(value) : value}
      </NeoText>
      <NeoChip
        label=">"
        accessibilityLabel={t('laterTimeLabel', { label })}
        disabled={index >= options.length - 1}
        onPress={() => onChange(options[index + 1])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1 },
  value: { minWidth: 56, textAlign: 'center' },
});
