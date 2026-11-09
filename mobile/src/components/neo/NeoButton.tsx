import { Pressable, type PressableProps, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { borderWidths, HARD_SHADOW_OFFSET, ON_ACCENT } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';
import { NeoText } from './NeoText';

type NeoButtonVariant = 'primary' | 'secondary';
type NeoButtonSize = 'md' | 'sm';

interface NeoButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: NeoButtonVariant;
  size?: NeoButtonSize;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PRESS_MS: Record<NeoButtonVariant, number> = { primary: 100, secondary: 120 };

export function NeoButton({
  label,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  style,
  onPressIn,
  onPressOut,
  ...props
}: NeoButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled === true;
  const isPrimary = variant === 'primary';
  const pressed = useSharedValue(0);

  // Same movement as .btn-primary-raw:active and the web's squash on other buttons.
  const faceStyle = useAnimatedStyle(() => {
    const amount = pressed.get();
    if (isPrimary) {
      const shift = amount * HARD_SHADOW_OFFSET;
      return { transform: [{ translateX: shift }, { translateY: shift }] };
    }
    return { transform: [{ scaleX: 1 - amount * 0.04 }, { scaleY: 1 + amount * 0.04 }] };
  });

  const faceColors = isDisabled
    ? { backgroundColor: colors.sunken, borderColor: colors.lineSoft }
    : isPrimary
      ? { backgroundColor: colors.accent, borderColor: ON_ACCENT }
      : { backgroundColor: colors.surface, borderColor: colors.ink };
  const textTone = isDisabled ? 'faint' : isPrimary ? 'onAccent' : 'ink';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? 4 : undefined}
      onPressIn={event => {
        pressed.set(withTiming(1, { duration: PRESS_MS[variant] }));
        onPressIn?.(event);
      }}
      onPressOut={event => {
        pressed.set(withTiming(0, { duration: PRESS_MS[variant] }));
        onPressOut?.(event);
      }}
      style={[fullWidth ? styles.fullWidth : styles.fitContent, style]}
      {...props}
    >
      {/* A separate View instead of boxShadow: pressing covers it exactly, and it draws the same on both systems. */}
      {isPrimary && !isDisabled && <View style={[styles.shadow, { backgroundColor: colors.shadow }]} />}
      <Animated.View style={[styles.face, size === 'sm' ? styles.faceSm : styles.faceMd, faceColors, faceStyle]}>
        <NeoText variant={size === 'sm' ? 'caption' : 'label'} tone={textTone}>
          {label}
        </NeoText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fitContent: { alignSelf: 'flex-start' },
  fullWidth: { alignSelf: 'stretch' },
  shadow: {
    position: 'absolute',
    top: HARD_SHADOW_OFFSET,
    left: HARD_SHADOW_OFFSET,
    right: -HARD_SHADOW_OFFSET,
    bottom: -HARD_SHADOW_OFFSET,
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borderWidths.regular,
  },
  faceMd: { minHeight: 48, paddingHorizontal: 24, paddingVertical: 8 },
  faceSm: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 4 },
});
