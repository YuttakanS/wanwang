import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { fonts } from '~/constants/fonts';
import { borderWidths } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';
import { NeoText } from './NeoText';

interface NeoInputProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export function NeoInput({ label, error, style, onFocus, onBlur, ...props }: NeoInputProps) {
  const { colors, scheme } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <NeoText variant="label">{label}</NeoText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? undefined}
        keyboardAppearance={scheme}
        maxFontSizeMultiplier={2}
        placeholderTextColor={colors.muted}
        selectionColor={colors.ink}
        onFocus={event => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={event => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            color: colors.ink,
            backgroundColor: colors.sunken,
            borderColor: colors.ink,
            outlineColor: colors.ink,
            outlineWidth: focused ? 2 : 0,
          },
          style,
        ]}
        {...props}
      />
      {error ? <NeoText variant="caption">{error}</NeoText> : null}
    </View>
  );
}

// No lineHeight: on iOS it pushes the text out of line inside a single-line field.
const styles = StyleSheet.create({
  field: { gap: 4 },
  input: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: borderWidths.regular,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
});
