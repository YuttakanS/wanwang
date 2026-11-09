import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { findBestTimeMatches } from '@/lib/timeUtils';
import type { Participant, WanWangEvent } from '@/types';
import { NeoBadge } from '~/components/neo/NeoBadge';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths, ON_ACCENT } from '~/constants/theme';
import { useAdminActions } from '~/hooks/useAdminActions';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';
import { ApiError } from '~/services/api';
import { errorMessage } from '~/services/errorMessage';

const TOP_MATCHES = 6;

interface BestTimesProps {
  event: WanWangEvent;
  participants: Participant[];
  isAdmin: boolean;
  onSelect: (slotIds: string[], date: string) => void;
}

export function BestTimes({ event, participants, isAdmin, onSelect }: BestTimesProps) {
  const { lang, t } = useI18n();
  const { colors } = useTheme();
  const { update } = useAdminActions(event.slug);

  const matches = useMemo(() => findBestTimeMatches(event, participants, TOP_MATCHES, lang), [event, participants, lang]);
  if (matches.length === 0) return null;

  const total = participants.length;
  const when = (match: (typeof matches)[number]) => {
    if (event.granularity === 'day') return t('allDayLabel');
    if (event.granularity === 'daypart') return `${match.dayPartLabel} (${match.startTime} - ${match.endTime})`;
    return `${match.startTime} - ${match.endTime} (${match.durationHours} ${t('durationSuffix')})`;
  };

  return (
    <NeoCard style={styles.card}>
      <NeoText variant="heading" accessibilityRole="header">
        {t('leaderboardTitle')}
      </NeoText>
      {update.error ? (
        <NeoNotice message={update.error instanceof ApiError && update.error.status === 403 ? t('adminLostError') : errorMessage(update.error, t)} />
      ) : null}

      {matches.map((match, index) => {
        const isPinned = event.confirmedDate === match.date;
        const isEveryone = match.availableCount === total;
        return (
          <NeoCard key={match.id} emphasis={isPinned} tone={isEveryone ? 'accent' : 'surface'} style={styles.match}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(match.slotIds, match.date)}
              style={styles.matchBody}
            >
              <View style={styles.matchTop}>
                <NeoText variant="label" tone={isEveryone ? 'onAccent' : 'ink'}>
                  {t('rankPrefix', { rank: index + 1 })}
                </NeoText>
                {isPinned && <NeoBadge label={t('pinnedBadge')} tone="ink" />}
                {isEveryone && <NeoBadge label={t('everyoneFree')} />}
              </View>
              <NeoText variant="label" tone={isEveryone ? 'onAccent' : 'ink'}>
                {match.formattedThai}
              </NeoText>
              <NeoText variant="caption" tone={isEveryone ? 'onAccent' : 'muted'}>
                {when(match)}
              </NeoText>
              <View style={[styles.bar, { backgroundColor: colors.sunken, borderColor: isEveryone ? ON_ACCENT : colors.ink }]}>
                <View style={[styles.barFill, { width: `${match.percentage}%`, backgroundColor: isEveryone ? ON_ACCENT : colors.accent }]} />
              </View>
              <NeoText variant="caption" tone={isEveryone ? 'onAccent' : 'ink'}>
                {t('freeCountText', { free: match.availableCount, total: match.totalParticipants })} · {t('matchPercent', { percent: match.percentage })}
              </NeoText>
              <NeoText variant="caption" tone={isEveryone ? 'onAccent' : 'ink'}>
                {t('availableLabel')} {match.availableNames.join(', ')}
              </NeoText>
              {match.missingNames.length > 0 && (
                <NeoText variant="caption" tone="muted">
                  {t('missingFriendsLabel')} {match.missingNames.join(', ')}
                </NeoText>
              )}
            </Pressable>
            {isAdmin && (
              <NeoButton
                label={isPinned ? t('unpinThisDate') : t('pinThisDate')}
                variant="secondary"
                size="sm"
                disabled={update.isPending}
                onPress={() => update.mutate({ confirmedDate: isPinned ? '' : match.date })}
              />
            )}
          </NeoCard>
        );
      })}
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 12 },
  match: { padding: 12, gap: 10 },
  matchBody: { gap: 4 },
  matchTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  bar: { height: 10, borderWidth: borderWidths.thin, marginVertical: 4 },
  barFill: { height: '100%' },
});
