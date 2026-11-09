import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { buildMonthCells } from '@/lib/monthCells';
import { computeHeatmap, formatDateToISO, formatLocalizedDate, generateAllEventSlots } from '@/lib/timeUtils';
import type { Participant, SlotHeatmapInfo, WanWangEvent } from '@/types';
import { DisabledGridCell, GridCell, MonthGrid } from '~/components/calendar/MonthGrid';
import { MonthHeader } from '~/components/calendar/MonthHeader';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths, heatColors } from '~/constants/theme';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';

interface HeatmapProps {
  event: WanWangEvent;
  participants: Participant[];
  rangeStart: string;
  rangeEnd: string;
  month: Date;
  onMonthChange: (month: Date) => void;
  inspected: string | null;
  onInspect: (date: string) => void;
  onVoteFirst: () => void;
}

export function Heatmap({ event, participants, rangeStart, rangeEnd, month, onMonthChange, inspected, onInspect, onVoteFirst }: HeatmapProps) {
  const { lang, t } = useI18n();
  const { colors } = useTheme();

  const heatmap = useMemo(() => computeHeatmap(generateAllEventSlots(event), participants, 'day'), [event, participants]);
  const days = useMemo(
    () => buildMonthCells(month, rangeStart, rangeEnd, formatDateToISO(new Date())),
    [month, rangeStart, rangeEnd],
  );

  if (participants.length === 0) {
    return (
      <NeoCard style={styles.card}>
        <NeoText variant="heading">{t('emptyHeatmapTitle')}</NeoText>
        <NeoText tone="muted">{t('emptyHeatmapDesc')}</NeoText>
        <NeoButton label={t('recordFirstBtn')} size="sm" onPress={onVoteFirst} />
      </NeoCard>
    );
  }

  const inspectedInfo: SlotHeatmapInfo | undefined = inspected ? heatmap[inspected] : undefined;
  const legend = [colors.surface, colors.heat1, colors.heat2, colors.heat3, colors.accent];

  return (
    <NeoCard style={styles.card}>
      <NeoText variant="heading">{t('inspectTitle')}</NeoText>
      <NeoText variant="caption" tone="muted">
        {t('inspectSubtitle')}
      </NeoText>

      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <NeoText variant="caption">{t('densityZero')}</NeoText>
        {legend.map(backgroundColor => (
          <View key={backgroundColor} style={[styles.swatch, { backgroundColor, borderColor: colors.ink }]} />
        ))}
        <NeoText variant="caption">{t('densityAll')}</NeoText>
      </View>

      <MonthHeader month={month} rangeStart={rangeStart} rangeEnd={rangeEnd} onChange={onMonthChange} />
      <MonthGrid
        days={days}
        renderCell={day => {
          if (!day.isInRange) return <DisabledGridCell dayNumber={day.dayNum} />;
          const info = heatmap[day.dateStr];
          const count = info?.availableCount ?? 0;
          const { background, text } = heatColors(info?.percentage ?? 0, count, colors);
          return (
            <GridCell
              dayNumber={day.dayNum}
              detail={`${count}/${participants.length}`}
              backgroundColor={background}
              color={text}
              emphasized={inspected === day.dateStr}
              selected={inspected === day.dateStr}
              accessibilityLabel={t('heatCellLabel', {
                date: formatLocalizedDate(day.dateStr, lang, 'chip'),
                count,
                total: participants.length,
              })}
              onPress={() => onInspect(day.dateStr)}
            />
          );
        }}
      />

      {inspectedInfo && (
        <NeoCard tone="sunken" style={styles.inspector} accessibilityLiveRegion="polite">
          <NeoText variant="label">{formatLocalizedDate(inspectedInfo.date, lang, 'full')}</NeoText>
          <NeoText variant="caption">{t('confirmedFreeLabel', { count: inspectedInfo.availableNames.length })}</NeoText>
          <NeoText>{inspectedInfo.availableNames.join(', ') || t('noneLabel')}</NeoText>
          <NeoText variant="caption">{t('busyListLabel', { count: inspectedInfo.unavailableNames.length })}</NeoText>
          <NeoText tone="muted">{inspectedInfo.unavailableNames.join(', ') || t('allAvailableLabel')}</NeoText>
        </NeoCard>
      )}
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  swatch: { width: 14, height: 14, borderWidth: borderWidths.thin },
  inspector: { padding: 12, gap: 4 },
});
