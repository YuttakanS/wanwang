import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NeoBadge } from '~/components/neo/NeoBadge';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoChip } from '~/components/neo/NeoChip';
import { NeoInput } from '~/components/neo/NeoInput';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
import { PrivacyNote } from '~/components/PrivacyNote';
import { Screen } from '~/components/Screen';
import { borderWidths, type ThemePreference } from '~/constants/theme';
import { useI18n } from '~/hooks/useI18n';
import { useMyEvents, useMyEventsActions } from '~/hooks/useMyEvents';
import { usePullToRefresh } from '~/hooks/usePullToRefresh';
import { useTheme } from '~/hooks/useTheme';
import { parseEventLink } from '~/services/deepLink';
import { errorMessage } from '~/services/errorMessage';
import { holdAdminLink } from '~/services/loadEvent';

const NEXT_THEME: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL_KEYS: Record<ThemePreference, string> = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' };

export default function HomeScreen() {
  const { lang, setLang, t } = useI18n();
  const { colors, preference, setPreference } = useTheme();
  const router = useRouter();

  const myEvents = useMyEvents();
  const { hide, showHidden } = useMyEventsActions();
  const pull = usePullToRefresh(myEvents.refetch);

  const [linkText, setLinkText] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  const openLink = () => {
    const link = parseEventLink(linkText);
    if (!link) return setLinkError(t('openLinkInvalid'));
    setLinkError(null);
    if (link.adminKey) holdAdminLink(link.slug, link.adminKey);
    setLinkText('');
    router.push({ pathname: '/e/[slug]', params: { slug: link.slug } });
  };

  const events = myEvents.data ?? [];
  const visible = events.filter(event => !event.hidden);
  const hiddenCount = events.length - visible.length;

  return (
    <Screen refreshing={pull.refreshing} onRefresh={pull.onRefresh}>
      <View style={styles.settings}>
        <NeoChip label={t('settingsLanguage')} onPress={() => setLang(lang === 'th' ? 'en' : 'th')} />
        <NeoChip label={t(THEME_LABEL_KEYS[preference])} onPress={() => setPreference(NEXT_THEME[preference])} />
        {__DEV__ && <NeoChip label="Preview" onPress={() => router.push('/preview')} />}
      </View>

      <View style={styles.hero}>
        <NeoText variant="title" accessibilityRole="header">
          {t('appName')}
        </NeoText>
        <NeoText tone="muted">{t('appSubtitle')}</NeoText>
      </View>

      <NeoButton fullWidth label={t('createEventBtn')} onPress={() => router.push('/create')} />

      <NeoCard style={styles.card}>
        <NeoInput
          label={t('openLinkTitle')}
          placeholder={t('openLinkPlaceholder')}
          value={linkText}
          onChangeText={text => {
            setLinkText(text);
            setLinkError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={openLink}
          error={linkError}
        />
        <NeoButton label={t('openLinkBtn')} variant="secondary" size="sm" onPress={openLink} />
      </NeoCard>

      <NeoCard style={styles.card}>
        <NeoText variant="heading" accessibilityRole="header">
          {t('myEventsTitle')}
        </NeoText>
        <NeoText variant="caption" tone="muted">
          {t('myEventsSubtitle')}
        </NeoText>

        {myEvents.isError && <NeoNotice message={errorMessage(myEvents.error, t)} />}
        {myEvents.isSuccess && visible.length === 0 && hiddenCount === 0 && <NeoText tone="muted">{t('myEventsEmpty')}</NeoText>}

        {visible.map((event, index) => (
          <View key={event.slug} style={[styles.event, index > 0 && { borderTopWidth: borderWidths.thin, borderTopColor: colors.ink }]}>
            <NeoText variant="label" tone="link" accessibilityRole="link" onPress={() => router.push({ pathname: '/e/[slug]', params: { slug: event.slug } })}>
              {event.title}
            </NeoText>
            <View style={styles.eventMeta}>
              {event.participantCount !== undefined && (
                <NeoText variant="caption" tone="muted">
                  {t('myEventsResponses', { count: event.participantCount })}
                </NeoText>
              )}
              {event.isClosed && <NeoBadge label={t('votingClosedBadge')} />}
              <NeoChip
                label={t('myEventsHideBtn')}
                accessibilityLabel={t('myEventsHideLabel', { title: event.title })}
                onPress={() => void hide(event.slug)}
              />
            </View>
          </View>
        ))}

        {hiddenCount > 0 && (
          <NeoText variant="caption" tone="link" accessibilityRole="button" onPress={() => void showHidden()}>
            {t('myEventsShowHidden', { count: hiddenCount })}
          </NeoText>
        )}
      </NeoCard>

      <PrivacyNote />
    </Screen>
  );
}

const styles = StyleSheet.create({
  settings: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hero: { gap: 4 },
  card: { padding: 12, gap: 10 },
  event: { gap: 6, paddingTop: 8 },
  eventMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
});
