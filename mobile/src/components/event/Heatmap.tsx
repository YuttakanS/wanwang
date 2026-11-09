import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { buildMonthCells } from '@/lib/monthCells';
import { computeHeatmap, formatDateToISO, formatLocalizedDate, generateAllEventSlots, generateDayTimeSlots } from '@/lib/timeUtils';
import type { DayPartId, Participant, SlotHeatmapInfo, WanWangEvent } from '@/types';
import { DAY_PART_IDS, dayColumnLabel, datesOnPage, daypartSlotId, hourSlotId } from '~/calendar/slotPages';
import { PART_LABEL_KEYS } from '~/components/calendar/DaypartGrid';
import { DisabledGridCell, GridCell, MonthGrid } from '~/components/calendar/MonthGrid';
import { MonthHeader } from '~/components/calendar/MonthHeader';
import { PageHeader } from '~/components/calendar/PageHeader';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoText } from '~/components/neo/NeoText';
import type { Translate } from '~/constants/strings';
import { borderWidths, heatColors } from '~/constants/theme';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';
import { HeatTable, type HeatRow } from './HeatTable';

interface HeatmapProps {
  event: WanWangEvent;
  participants: Participant[];
  rangeStart: string;
  rangeEnd: string;
  month: Date;
  onMonthChange: (month: Date) => void;
  page: number;
  onPageChange: (page: number) => void;
  inspected: string | null;
  /** The slots of the best time that was chosen. */
  highlighted: string[];
  onInspect: (slotId: string) => void;
  onVoteFirst: () => void;
}

function partText(part: DayPartId, t: Translate): string {
  return `${t(PART_LABEL_KEYS[part].name)} (${t(PART_LABEL_KEYS[part].range)})`;
}

export function Heatmap({
  event,
  participants,
  rangeStart,
  rangeEnd,
  month,
  onMonthChange,
  page,
  onPageChange,
  inspected,
  highlighted,
  onInspect,
  onVoteFirst,
}: HeatmapProps) {
  const { lang, t } = useI18n();
  const { colors } = useTheme();
  const granularity = event.granularity || 'day';
  const total = participants.length;

  const heatmap = useMemo(() => computeHeatmap(generateAllEventSlots(event), participants, granularity), [event, participants, granularity]);
  const days = useMemo(() => buildMonthCells(month, rangeStart, rangeEnd, formatDateToISO(new Date())), [month, rangeStart, rangeEnd]);
  const times = useMemo(
    () => generateDayTimeSlots(event.startTime || '09:00', event.endTime || '22:00', event.slotInterval || 60),
    [event.startTime, event.endTime, event.slotInterval],
  );

  if (total === 0) {
    return (
      <NeoCard style={styles.card}>
        <NeoText variant="heading">{t('emptyHeatmapTitle')}</NeoText>
        <NeoText tone="muted">{t('emptyHeatmapDesc')}</NeoText>
        <NeoButton label={t('recordFirstBtn')} size="sm" onPress={onVoteFirst} />
      </NeoCard>
    );
  }

  const slotTitle = (info: SlotHeatmapInfo) => {
    const chip = formatLocalizedDate(info.date, lang, 'chip');
    if (granularity === 'day') return `${chip} (${t('allDayLabel')})`;
    if (granularity === 'daypart') return `${chip} - ${partText(info.time as DayPartId, t)}`;
    return t('dataHeader', { date: chip, time: info.time });
  };

  const isEmphasized = (slotId: string) => inspected === slotId || highlighted.includes(slotId);
  const tableLabel = (slotId: string, count: number) => {
    const info = heatmap[slotId];
    return t('heatCellLabel', { date: info ? slotTitle(info) : slotId, count, total });
  };

  const shownDates = datesOnPage(event.dates, page);
  const hourRows: HeatRow[] = times.map(time => ({ key: time, label: time, slotIds: shownDates.map(date => hourSlotId(date, time)) }));
  const daypartRows: HeatRow[] = shownDates.map(date => ({
    key: date,
    label: dayColumnLabel(date, lang),
    slotIds: DAY_PART_IDS.map(part => daypartSlotId(date, part)),
  }));

  const inspectedInfo = inspected ? heatmap[inspected] : undefined;
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

      {granularity === 'day' ? (
        <>
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
                  detail={`${count}/${total}`}
                  backgroundColor={background}
                  color={text}
                  emphasized={isEmphasized(day.dateStr)}
                  selected={isEmphasized(day.dateStr)}
                  accessibilityLabel={t('heatCellLabel', { date: formatLocalizedDate(day.dateStr, lang, 'chip'), count, total })}
                  onPress={() => onInspect(day.dateStr)}
                />
              );
            }}
          />
        </>
      ) : (
        <>
          <PageHeader dates={event.dates} page={page} onChange={onPageChange} />
          <HeatTable
            columnLabels={
              granularity === 'hour'
                ? shownDates.map(date => dayColumnLabel(date, lang))
                : DAY_PART_IDS.map(part => `${t(PART_LABEL_KEYS[part].name)}\n${t(PART_LABEL_KEYS[part].range)}`)
            }
            rows={granularity === 'hour' ? hourRows : daypartRows}
            heatmap={heatmap}
            total={total}
            isEmphasized={isEmphasized}
            labelFor={tableLabel}
            onInspect={onInspect}
          />
        </>
      )}

      {inspectedInfo && (
        <NeoCard tone="sunken" style={styles.inspector} accessibilityLiveRegion="polite">
          <NeoText variant="label">{slotTitle(inspectedInfo)}</NeoText>
          <NeoText variant="monoBold">
            {inspectedInfo.availableCount}/{inspectedInfo.totalParticipants} ({inspectedInfo.percentage}%)
          </NeoText>
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
