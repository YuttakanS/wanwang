import { StyleSheet, Text, type TextProps } from 'react-native';
import { fonts } from '~/constants/fonts';
import { ON_ACCENT, type ThemeColors } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';

type NeoTextVariant = 'title' | 'heading' | 'body' | 'label' | 'caption' | 'mono' | 'monoBold';
type NeoTextTone = 'ink' | 'muted' | 'faint' | 'link' | 'onAccent';

interface NeoTextProps extends TextProps {
  variant?: NeoTextVariant;
  tone?: NeoTextTone;
}

const toneColor = (tone: NeoTextTone, colors: ThemeColors) => (tone === 'onAccent' ? ON_ACCENT : colors[tone]);

export function NeoText({ variant = 'body', tone = 'ink', maxFontSizeMultiplier = 2, style, ...props }: NeoTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[styles[variant], { color: toneColor(tone, colors) }, style]}
      {...props}
    />
  );
}

// No lineHeight: Plex Thai's natural 1.65 fits stacked Thai marks, and anything tighter can clip them.
const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 24 },
  heading: { fontFamily: fonts.bold, fontSize: 18 },
  body: { fontFamily: fonts.regular, fontSize: 14 },
  label: { fontFamily: fonts.bold, fontSize: 14 },
  caption: { fontFamily: fonts.semibold, fontSize: 12 },
  mono: { fontFamily: fonts.mono, fontSize: 14 },
  monoBold: { fontFamily: fonts.monoBold, fontSize: 14 },
});
