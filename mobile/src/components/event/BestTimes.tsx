import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { findBestTimeMatches, formatDateToISO } from '@/lib/timeUtils';
import type { Participant, WanWangEvent } from '@/types';
import { NeoBadge } from '~/components/neo/NeoBadge';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
import { SectionHeader } from '~/components/SectionHeader';
import { borderWidths } from '~/constants/theme';
import { useAdminActions } from '~/hooks/useAdminActions';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';
import { errorMessage } from '~/services/errorMessage';

const TOP_MATCHES = 6;
// Enough to still find upcoming matches after leaving out days already gone.
const CANDIDATES = 400;

interface BestTimesProps {
  event: WanWangEvent;
  participants: Participant[];
  isAdmin: boolean;
  onSelect: (slotIds: string[], date: string) => void;
  onAdminLost: () => void;
}

export function BestTimes({ event, participants, isAdmin, onSelect, onAdminLost }: BestTimesProps) {
  const { lang, t } = useI18n();
  const { colors } = useTheme();
  const { update } = useAdminActions(event.slug, onAdminLost);

  const matches = useMemo(() => {
    const all = findBestTimeMatches(event, participants, CANDIDATES, lang);
    const today = formatDateToISO(new Date());
    const upcoming = all.filter(match => match.date >= today);
    // An event that has ended still shows how it turned out.
    return (upcoming.length > 0 ? upcoming : all).slice(0, TOP_MATCHES);
  }, [event, participants, lang]);
  if (matches.length === 0) return null;

  const total = participants.length;
  const hasEveryone = matches.some(match => match.availableCount === total);
  const when = (match: (typeof matches)[number]) => {
    if (event.granularity === 'day') return t('allDayLabel');
    if (event.granularity === 'daypart') return `${match.dayPartLabel} (${match.startTime} - ${match.endTime})`;
    return `${match.startTime} - ${match.endTime} (${match.durationHours} ${t('durationSuffix')})`;
  };

  return (
    <NeoCard style={styles.card}>
      <SectionHeader
        title={t('leaderboardTitle')}
        subtitle={t('leaderboardSubtitle')}
        badge={hasEveryone ? t('everyoneFree') : t('closestMatch')}
        badgeTone={hasEveryone ? 'accent' : 'sunken'}
      />
      {update.error ? <NeoNotice message={errorMessage(update.error, t)} /> : null}

      {matches.map((match, index) => {
        const isPinned = event.confirmedDate === match.date;
        const isEveryone = match.availableCount === total;
        // The website's yellow tints: a quarter for everyone free, less for the pinned one.
        const backgroundColor = isPinned ? `${colors.accent}26` : isEveryone ? `${colors.accent}40` : colors.surface;
        return (
          <View
            key={match.id}
            style={[
              styles.match,
              { backgroundColor, borderColor: colors.ink, borderWidth: isPinned ? borderWidths.thick : borderWidths.regular },
            ]}
          >
            <Pressable accessibilityRole="button" onPress={() => onSelect(match.slotIds, match.date)} style={styles.matchBody}>
              <View style={styles.matchTop}>
                <View style={styles.rank}>
                  <NeoText variant="heading">{t('rankPrefix', { rank: index + 1 })}</NeoText>
                  {isPinned && <NeoBadge label={t('pinnedBadge')} tone="ink" />}
                </View>
                <View style={styles.rank}>
                  {isEveryone ? (
                    <NeoBadge label={t('everyoneFree')} tone="accent" />
                  ) : index === 0 ? (
                    <NeoBadge label={t('closestMatch')} tone="sunken" />
                  ) : null}
                  <NeoBadge label={t('matchPercent', { percent: match.percentage })} />
                </View>
              </View>

              <View>
                <NeoText variant="label">{match.formattedThai}</NeoText>
                <NeoText variant="caption" tone="muted">
                  {when(match)}
                </NeoText>
              </View>

              <View style={[styles.bar, { backgroundColor: colors.sunken, borderColor: colors.ink }]}>
                <View style={[styles.barFill, { width: `${match.percentage}%`, backgroundColor: colors.accent, borderColor: colors.ink }]} />
              </View>

              <View style={styles.counts}>
                <NeoText variant="caption">{t('freeCountText', { free: match.availableCount, total: match.totalParticipants })}</NeoText>
                <NeoText variant="caption" tone={match.missingNames.length === 0 ? 'ink' : 'muted'}>
                  {match.missingNames.length === 0 ? `[${t('allAvailableLabel')}]` : t('missingCount', { count: match.missingNames.length })}
                </NeoText>
              </View>

              <View style={[styles.names, { borderTopColor: colors.ink }]}>
                <NeoText variant="caption" tone="muted" numberOfLines={2}>
                  <NeoText variant="caption">{t('availableLabel')}</NeoText> {match.availableNames.join(', ')}
                </NeoText>
                {match.missingNames.length > 0 && (
                  <NeoText variant="caption" tone="muted" numberOfLines={2}>
                    <NeoText variant="caption">{t('missingFriendsLabel')}</NeoText> {match.missingNames.join(', ')}
                  </NeoText>
                )}
              </View>
            </Pressable>
            {isAdmin && (
              <View style={[styles.pinRow, { borderTopColor: colors.ink }]}>
                <NeoButton
                  label={isPinned ? `✓ ${t('unpinThisDate')}` : `📌 ${t('pinThisDate')}`}
                  accessibilityLabel={`${isPinned ? t('unpinThisDate') : t('pinThisDate')} ${match.formattedThai}`}
                  variant={isPinned ? 'ink' : 'primary'}
                  size="sm"
                  style={styles.pinButton}
                  disabled={update.isPending}
                  onPress={() => update.mutate({ confirmedDate: isPinned ? '' : match.date })}
                />
              </View>
            )}
          </View>
        );
      })}
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  match: { padding: 16, gap: 12 },
  matchBody: { gap: 12 },
  matchTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  rank: { flexDirection: 'row', flexWrap: 'wrap', flexShrink: 1, alignItems: 'center', gap: 6 },
  bar: { height: 12, borderWidth: borderWidths.thin },
  barFill: { height: '100%', borderRightWidth: borderWidths.thin },
  counts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  names: { gap: 4, paddingTop: 8, borderTopWidth: borderWidths.thin },
  pinRow: { paddingTop: 10, borderTopWidth: borderWidths.thin },
  pinButton: { alignSelf: 'flex-end' },
});
