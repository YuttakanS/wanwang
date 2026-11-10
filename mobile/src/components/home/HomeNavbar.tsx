import { Moon, Sun, SunMoon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths, type ThemePreference } from '~/constants/theme';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';

const LANGUAGES = [
  { code: 'en', label: 'ENG' },
  { code: 'th', label: 'TH' },
] as const;

const NEXT_THEME: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL_KEYS: Record<ThemePreference, string> = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' };
const THEME_ICONS = { system: SunMoon, light: Sun, dark: Moon };

/** The website's navbar: logo and name on the left, language and theme on the right. */
export function HomeNavbar() {
  const { lang, setLang, t } = useI18n();
  const { colors, preference, setPreference } = useTheme();
  const ThemeIcon = THEME_ICONS[preference];

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.ink }]}>
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: colors.ink }]}>
          <NeoText variant="heading" style={{ color: colors.surface }}>
            ว
          </NeoText>
        </View>
        <NeoText variant="heading" numberOfLines={1} style={styles.name}>
          {t('appName')}
        </NeoText>
      </View>

      <View style={[styles.languages, { borderColor: colors.ink }]}>
        {LANGUAGES.map(({ code, label }, index) => {
          const selected = lang === code;
          return (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={label === 'TH' ? 'ภาษาไทย' : 'English'}
              hitSlop={{ top: 9, bottom: 9, left: 4, right: 4 }}
              onPress={() => setLang(code)}
              style={[
                styles.language,
                { backgroundColor: selected ? colors.ink : colors.surface },
                index > 0 && { borderLeftWidth: borderWidths.thin, borderLeftColor: colors.ink },
              ]}
            >
              <NeoText variant="monoBold" style={[styles.languageText, { color: selected ? colors.surface : colors.ink }]}>
                {label}
              </NeoText>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(THEME_LABEL_KEYS[preference])}
        hitSlop={6}
        onPress={() => setPreference(NEXT_THEME[preference])}
        style={({ pressed }) => [styles.theme, { borderColor: colors.ink, backgroundColor: pressed ? colors.sunken : colors.surface }]}
      >
        <ThemeIcon size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Cancels Screen's padding, so the line under the bar runs edge to edge as on the website.
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 16,
    minHeight: 64,
    borderBottomWidth: borderWidths.regular,
  },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  name: { flexShrink: 1 },
  languages: { flexDirection: 'row', borderWidth: borderWidths.regular },
  language: { minHeight: 30, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  languageText: { fontSize: 12 },
  theme: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: borderWidths.regular },
});
