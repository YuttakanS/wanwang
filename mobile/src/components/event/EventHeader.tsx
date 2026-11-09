import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatLocalizedDate, formatLocalizedDateRange } from '@/lib/timeUtils';
import type { Participant, WanWangEvent } from '@/types';
import { NeoBadge } from '~/components/neo/NeoBadge';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoChip } from '~/components/neo/NeoChip';
import { NeoText } from '~/components/neo/NeoText';
import { CATEGORY_LABEL_KEYS } from '~/constants/strings';
import { useI18n } from '~/hooks/useI18n';
import { ManagePanel } from './ManagePanel';
import { SharePanel } from './SharePanel';

interface EventHeaderProps {
  event: WanWangEvent;
  participants: Participant[];
  isAdmin: boolean;
  onAdminKeyRotated: () => void;
}

export function EventHeader({ event, participants, isAdmin, onAdminKeyRotated }: EventHeaderProps) {
  const { lang, t } = useI18n();
  // Collapsed by default, so people opening a link reach the voting form straight away.
  const [panel, setPanel] = useState<'share' | 'manage' | null>(null);
  const togglePanel = (next: 'share' | 'manage') => setPanel(current => (current === next ? null : next));

  const rangeStart = event.dateRangeStart || event.dates[0];
  const rangeEnd = event.dateRangeEnd || event.dates[event.dates.length - 1];
  const range = rangeStart && rangeEnd ? formatLocalizedDateRange(rangeStart, rangeEnd, lang) : '';
  const format =
    event.granularity === 'day'
      ? t('metaFormatDay')
      : event.granularity === 'daypart'
        ? t('metaFormatDaypart')
        : t('metaFormatHour', { start: event.startTime, end: event.endTime });

  return (
    <>
      {event.confirmedDate ? (
        <NeoCard tone="accent" style={styles.pinned}>
          <NeoText variant="caption" tone="onAccent">
            {t('pinnedBannerTitle')}
          </NeoText>
          <NeoText variant="heading" tone="onAccent">
            {formatLocalizedDate(event.confirmedDate, lang, 'chip')}
            {event.granularity === 'day' ? ` (${t('allDayLabel')})` : ''}
          </NeoText>
        </NeoCard>
      ) : null}

      <NeoCard emphasis style={styles.card}>
        <View style={styles.badges}>
          <NeoBadge label={t(CATEGORY_LABEL_KEYS[event.category])} tone="ink" />
          {event.isClosed && <NeoBadge label={t('votingClosedBadge')} />}
        </View>
        <NeoText variant="title" accessibilityRole="header">
          {event.title}
        </NeoText>
        {event.description ? <NeoText tone="muted">{event.description}</NeoText> : null}
        <View style={styles.meta}>
          <NeoText variant="caption">{t('metaDatesLabel', { count: event.dates.length, range })}</NeoText>
          <NeoText variant="caption">{format}</NeoText>
          {event.location ? <NeoText variant="caption">{t('metaLocationLabel', { loc: event.location })}</NeoText> : null}
        </View>
        <View style={styles.toggles}>
          <NeoChip label={t('shareToggleBtn')} selected={panel === 'share'} onPress={() => togglePanel('share')} />
          {isAdmin && <NeoChip label={t('manageToggleBtn')} selected={panel === 'manage'} onPress={() => togglePanel('manage')} />}
        </View>
        {panel === 'share' && <SharePanel event={event} participants={participants} />}
        {panel === 'manage' && isAdmin && <ManagePanel event={event} onAdminKeyRotated={onAdminKeyRotated} />}
      </NeoCard>
    </>
  );
}

const styles = StyleSheet.create({
  pinned: { padding: 16, gap: 4 },
  card: { padding: 16, gap: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meta: { gap: 2 },
  toggles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
