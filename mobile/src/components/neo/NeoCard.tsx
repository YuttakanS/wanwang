import { StyleSheet, View, type ViewProps } from 'react-native';
import { borderWidths, ON_ACCENT } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';

type NeoCardTone = 'surface' | 'sunken' | 'accent';

interface NeoCardProps extends ViewProps {
  tone?: NeoCardTone;
  /** The 5px border the website uses for the main card on a page. */
  emphasis?: boolean;
}

export function NeoCard({ tone = 'surface', emphasis = false, style, ...props }: NeoCardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors[tone],
          borderColor: tone === 'accent' ? ON_ACCENT : colors.ink,
          borderWidth: emphasis ? borderWidths.thick : borderWidths.regular,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: 12 },
});
