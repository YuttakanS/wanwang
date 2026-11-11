import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatLocalizedDate, formatLocalizedDateRange } from '@/lib/timeUtils';
import type { Participant, WanWangEvent } from '@/types';
import { NeoBadge } from '~/components/neo/NeoBadge';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoText } from '~/components/neo/NeoText';
import { CATEGORY_LABEL_KEYS } from '~/constants/strings';
import { borderWidths, HARD_SHADOW_OFFSET, ON_ACCENT } from '~/constants/theme';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';
import { ManagePanel } from './ManagePanel';
import { SharePanel } from './SharePanel';

interface EventHeaderProps {
  event: WanWangEvent;
  participants: Participant[];
  isAdmin: boolean;
  onAdminKeyRotated: (newKey: string) => void;
  onAdminLost: () => void;
}

export function EventHeader({ event, participants, isAdmin, onAdminKeyRotated, onAdminLost }: EventHeaderProps) {
  const { lang, t } = useI18n();
  const { colors } = useTheme();
  // Collapsed by default, so people opening a link reach the voting form straight away.
  const [panel, setPanel] = useState<'share' | 'manage' | null>(null);
  const togglePanel = (next: 'share' | 'manage') => setPanel(current => (current === next ? null : next));
  const chevron = (open: boolean, color: string) => {
    const Icon = open ? ChevronUp : ChevronDown;
    return <Icon size={16} color={color} />;
  };

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
        <View>
          <View style={[styles.pinnedShadow, { backgroundColor: colors.shadow }]} />
          <View style={[styles.pinned, { backgroundColor: colors.accent }]}>
            <View style={styles.pinnedText}>
              <NeoText variant="caption" tone="onAccent">
                {t('pinnedBannerTitle')}
              </NeoText>
              <NeoText variant="heading" tone="onAccent">
                {formatLocalizedDate(event.confirmedDate, lang, 'chip')}
                {event.granularity === 'day' ? ` (${t('allDayLabel')})` : ''}
              </NeoText>
            </View>
            <View style={styles.pinnedBadge}>
              <NeoText variant="caption" style={{ color: colors.accent }}>
                {t('pinnedBadge')}
              </NeoText>
            </View>
          </View>
        </View>
      ) : null}

      <NeoCard emphasis style={styles.card}>
        <View style={styles.badges}>
          <NeoBadge label={t(CATEGORY_LABEL_KEYS[event.category])} tone="ink" />
          {event.isClosed && <NeoBadge label={t('votingClosedBadge')} />}
        </View>
        <View style={styles.titles}>
          <NeoText variant="title" accessibilityRole="header">
            {event.title}
          </NeoText>
          {event.description ? <NeoText tone="muted">{event.description}</NeoText> : null}
        </View>
        <View style={[styles.meta, { borderTopColor: colors.ink }]}>
          <NeoText variant="caption">{t('metaDatesLabel', { count: event.dates.length, range })}</NeoText>
          <NeoText variant="caption">{format}</NeoText>
          {event.location ? <NeoText variant="caption">{t('metaLocationLabel', { loc: event.location })}</NeoText> : null}
        </View>
        <View style={[styles.actions, { borderTopColor: colors.ink }]}>
          <View style={styles.toggles}>
            <NeoButton
              label={t('shareToggleBtn')}
              size="sm"
              icon={chevron(panel === 'share', ON_ACCENT)}
              accessibilityState={{ expanded: panel === 'share' }}
              onPress={() => togglePanel('share')}
            />
            {isAdmin && (
              <NeoButton
                label={t('manageToggleBtn')}
                variant="secondary"
                size="sm"
                icon={chevron(panel === 'manage', colors.ink)}
                accessibilityState={{ expanded: panel === 'manage' }}
                onPress={() => togglePanel('manage')}
              />
            )}
          </View>
          {panel === 'share' && <SharePanel event={event} participants={participants} />}
          {panel === 'manage' && isAdmin && <ManagePanel event={event} hasVotes={participants.length > 0} onAdminKeyRotated={onAdminKeyRotated} onAdminLost={onAdminLost} />}
        </View>
      </NeoCard>
    </>
  );
}

const styles = StyleSheet.create({
  pinnedShadow: {
    position: 'absolute',
    top: HARD_SHADOW_OFFSET,
    left: HARD_SHADOW_OFFSET,
    right: -HARD_SHADOW_OFFSET,
    bottom: -HARD_SHADOW_OFFSET,
  },
  pinned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 4,
    borderColor: ON_ACCENT,
  },
  pinnedText: { flex: 1 },
  pinnedBadge: { backgroundColor: ON_ACCENT, paddingHorizontal: 8, paddingVertical: 2 },
  card: { gap: 16 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  titles: { gap: 4 },
  meta: { gap: 2, paddingTop: 12, borderTopWidth: borderWidths.regular },
  actions: { gap: 12, paddingTop: 16, borderTopWidth: borderWidths.regular },
  toggles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
