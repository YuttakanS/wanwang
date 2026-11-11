import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { buildMonthCells } from '@/lib/monthCells';
import { formatDateToISO, formatLocalizedDate, generateAllEventSlots, generateDayTimeSlots, isWeekend } from '@/lib/timeUtils';
import type { Participant, WanWangEvent } from '@/types';
import { datesOnPage } from '~/calendar/slotPages';
import { DayGrid } from '~/components/calendar/DayGrid';
import { DaypartGrid } from '~/components/calendar/DaypartGrid';
import { HourGrid } from '~/components/calendar/HourGrid';
import { MonthHeader } from '~/components/calendar/MonthHeader';
import { PageHeader } from '~/components/calendar/PageHeader';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoChip } from '~/components/neo/NeoChip';
import { NeoInput } from '~/components/neo/NeoInput';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
import { PrivacyNote } from '~/components/PrivacyNote';
import { borderWidths } from '~/constants/theme';
import { EDIT_TOKEN_UNAVAILABLE, useSaveVote } from '~/hooks/useEvent';
import { useI18n } from '~/hooks/useI18n';
import { useSelectionStore } from '~/hooks/useSelectionStore';
import { useTheme } from '~/hooks/useTheme';
import { ApiError } from '~/services/api';
import { errorMessage } from '~/services/errorMessage';
import { HeatLegend, Heatmap } from './Heatmap';

// The API's limits, in LIMITS in src/lib/validation.ts, which cannot be imported here because it uses crypto.
const MAX_NAME_LENGTH = 50;
const MAX_NOTE_LENGTH = 300;

export type ScheduleTab = 'vote' | 'heatmap';

interface ScheduleProps {
  event: WanWangEvent;
  participants: Participant[];
  rangeStart: string;
  rangeEnd: string;
  tab: ScheduleTab;
  onTabChange: (tab: ScheduleTab) => void;
  month: Date;
  onMonthChange: (month: Date) => void;
  page: number;
  onPageChange: (page: number) => void;
  inspected: string | null;
  highlighted: string[];
  onInspect: (slotId: string) => void;
  onDraggingChange: (dragging: boolean) => void;
}

/** Answering and the group view, for all three event formats. */
export function Schedule({
  event,
  participants,
  rangeStart,
  rangeEnd,
  tab,
  onTabChange,
  month,
  onMonthChange,
  page,
  onPageChange,
  inspected,
  highlighted,
  onInspect,
  onDraggingChange,
}: ScheduleProps) {
  const { lang, t } = useI18n();
  const { colors } = useTheme();
  const { store, slots, outsideVersion } = useSelectionStore();
  const save = useSaveVote(event.slug, event.title);

  const granularity = event.granularity || 'day';
  const mine = participants.find(p => p.isMine);
  const mineId = mine?.id ?? null;

  // Null until typed in, so the saved answer shows without overwriting anything being edited.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const name = nameDraft ?? mine?.name ?? '';
  const note = noteDraft ?? mine?.note ?? '';
  const [triedSaving, setTriedSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Fills the calendar once per answer. Refetches happen whenever the app returns to the
  // foreground, and must not wipe what the person is in the middle of changing.
  const filledFor = useRef<string | null>(null);
  // Known from the save itself, for when the refetch after it fails and the next save would otherwise
  // create a second answer. Left to the refetch's answer as soon as there is one.
  const savedId = useRef<string | null>(null);
  useEffect(() => {
    if (mineId) savedId.current = null;
    if (mineId === filledFor.current) return;
    filledFor.current = mineId;
    if (!mine) return;
    store.replace(mine.availability ?? mine.availableDates ?? []);
    onTabChange('heatmap');
  }, [mine, mineId, store, onTabChange]);

  const today = formatDateToISO(new Date());
  const days = buildMonthCells(month, rangeStart, rangeEnd, today);
  const shownDates = datesOnPage(event.dates, page);
  const times = useMemo(
    () => generateDayTimeSlots(event.startTime || '09:00', event.endTime || '22:00', event.slotInterval || 60),
    [event.startTime, event.endTime, event.slotInterval],
  );
  // Past days cannot be chosen, so the shortcuts leave them out too.
  const selectable = useMemo(() => generateAllEventSlots(event).filter(slot => slot.date >= today), [event, today]);

  // The API refuses slots the event does not have, which picks can hold after the range changes
  // on the website while this screen is open.
  const eventSlotIds = useMemo(() => new Set(generateAllEventSlots(event).map(slot => slot.id)), [event]);
  const picked = slots.filter(id => eventSlotIds.has(id));

  // Worked out on each render, so the message goes away as soon as the person fixes the problem.
  const problem = !name.trim() ? t('errorNameRequired') : picked.length === 0 ? t('errorSlotRequired') : null;

  const submit = () => {
    setJustSaved(false);
    if (problem) {
      save.reset();
      return setTriedSaving(true);
    }

    save.mutate(
      { participantId: mineId ?? savedId.current ?? undefined, name: name.trim(), note: note.trim(), availability: picked },
      {
        onSuccess: id => {
          savedId.current = id;
          setJustSaved(true);
          onTabChange('heatmap');
        },
        onError: error => {
          if (error instanceof ApiError && (error.status === 403 || error.status === EDIT_TOKEN_UNAVAILABLE)) savedId.current = null;
        },
      },
    );
  };

  const saveError = save.error instanceof ApiError && save.error.status === 403 ? t('voteStaleError') : save.error ? errorMessage(save.error, t) : null;
  const shownError = triedSaving && problem ? problem : saveError;

  return (
    <View style={styles.schedule}>
      <View style={[styles.tabBar, { borderColor: colors.ink, backgroundColor: colors.surface }]}>
        <View accessibilityRole="tablist" style={styles.tabs}>
          {(
            [
              { id: 'vote', label: t('tabVote', { count: slots.length }) },
              { id: 'heatmap', label: t('tabHeatmap', { count: participants.length }) },
            ] as const
          ).map(item => {
            const selected = tab === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                hitSlop={{ top: 4, bottom: 4 }}
                onPress={() => {
                  if (item.id === 'vote') setJustSaved(false);
                  onTabChange(item.id);
                }}
                style={({ pressed }) => [
                  styles.tab,
                  { borderColor: colors.ink, backgroundColor: selected ? colors.ink : pressed ? colors.sunken : colors.surface },
                ]}
              >
                <NeoText variant="caption" style={{ color: selected ? colors.surface : colors.ink }}>
                  {item.label}
                </NeoText>
              </Pressable>
            );
          })}
        </View>
        {tab === 'heatmap' && <HeatLegend />}
      </View>

      {justSaved && tab === 'heatmap' && <NeoNotice tone="sunken" message={t('saveSuccessMsg')} />}

      {tab === 'heatmap' && (
        <Heatmap
          event={event}
          participants={participants}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          month={month}
          onMonthChange={onMonthChange}
          page={page}
          onPageChange={onPageChange}
          inspected={inspected}
          highlighted={highlighted}
          onInspect={onInspect}
          onVoteFirst={() => onTabChange('vote')}
        />
      )}

      {tab === 'vote' && (event.isClosed || selectable.length === 0) && (
        <NeoCard>
          <View style={[styles.closed, { backgroundColor: colors.sunken, borderColor: colors.ink }]}>
            <NeoText variant="label" style={styles.center}>
              {event.isClosed ? t('votingClosedAlert') : t('eventPastNotice')}
            </NeoText>
          </View>
        </NeoCard>
      )}

      {tab === 'vote' && !event.isClosed && selectable.length > 0 && (
        <NeoCard style={styles.card}>
          <View style={[styles.who, { borderBottomColor: colors.ink }]}>
            <View style={styles.field}>
              <NeoInput
                label={t('yourNameLabel')}
                placeholder={t('yourNamePlaceholder')}
                value={name}
                onChangeText={setNameDraft}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="off"
              />
              {mine && <NeoText variant="caption">{t('editResponseNote')}</NeoText>}
            </View>
            <NeoInput
              label={t('yourNoteLabel')}
              placeholder={t('yourNotePlaceholder')}
              value={note}
              onChangeText={setNoteDraft}
              maxLength={MAX_NOTE_LENGTH}
            />
          </View>
          <PrivacyNote text={t('voteVisibilityNote')} />

          <View style={[styles.instructions, { backgroundColor: colors.sunken, borderColor: colors.ink }]}>
            <NeoText variant="caption">
              {granularity === 'day' ? t('voteCalendarPrompt') : granularity === 'daypart' ? t('votePromptDaypart') : t('dragInstructions')}
            </NeoText>
            <View style={styles.shortcuts}>
              <NeoChip
                label={t('shortcutWeekendsOnly')}
                onPress={() => store.replace(new Set([...slots, ...selectable.filter(slot => isWeekend(slot.date)).map(slot => slot.id)]))}
              />
              <NeoChip
                label={t('btnSelectAll')}
                // Adds to the selection, so days already gone in an earlier answer are not silently dropped.
                onPress={() => store.replace(new Set([...slots, ...selectable.map(slot => slot.id)]))}
              />
              {slots.length > 0 && <NeoChip label={t('shortcutClearSelection')} onPress={() => store.replace([])} />}
            </View>
          </View>

          {granularity === 'day' ? (
            <>
              <MonthHeader month={month} rangeStart={rangeStart} rangeEnd={rangeEnd} onChange={onMonthChange} />
              <DayGrid
                key={formatDateToISO(month)}
                days={days}
                store={store}
                outsideVersion={outsideVersion}
                labelFor={day => formatLocalizedDate(day.dateStr, lang, 'chip')}
                onDraggingChange={onDraggingChange}
              />
            </>
          ) : (
            <>
              <PageHeader dates={event.dates} page={page} onChange={onPageChange} />
              {granularity === 'daypart' ? (
                <DaypartGrid dates={shownDates} today={today} store={store} />
              ) : (
                <HourGrid
                  // A new column or row needs a fresh measure, which a grid of unchanged width does not get.
                  key={`${page}-${shownDates.length}-${times.length}`}
                  dates={shownDates}
                  times={times}
                  today={today}
                  store={store}
                  outsideVersion={outsideVersion}
                  onDraggingChange={onDraggingChange}
                />
              )}
            </>
          )}

          {shownError && <NeoNotice message={shownError} />}

          <View style={[styles.footer, { borderTopColor: colors.ink }]}>
            <NeoText variant="label">{t(granularity === 'day' ? 'selectedDaysCount' : 'selectedSlotsCount', { count: slots.length })}</NeoText>
            <NeoButton
              fullWidth
              label={save.isPending ? t('savingDataBtn') : t('saveMyAvailabilityBtn')}
              disabled={save.isPending}
              onPress={submit}
            />
          </View>
        </NeoCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  schedule: { gap: 16 },
  tabBar: { gap: 10, padding: 10, borderWidth: borderWidths.regular },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderWidth: borderWidths.regular },
  closed: { padding: 16, borderWidth: borderWidths.regular },
  center: { textAlign: 'center' },
  card: { gap: 16 },
  who: { gap: 12, paddingBottom: 16, borderBottomWidth: borderWidths.regular },
  field: { gap: 4 },
  instructions: { gap: 10, padding: 12, borderWidth: borderWidths.thin },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { gap: 10, paddingTop: 12, borderTopWidth: borderWidths.regular },
});
