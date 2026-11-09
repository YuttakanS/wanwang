import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { buildMonthCells } from '@/lib/monthCells';
import { formatDateToISO, formatLocalizedDate, isWeekend } from '@/lib/timeUtils';
import type { Participant, WanWangEvent } from '@/types';
import { DayGrid } from '~/components/calendar/DayGrid';
import { MonthHeader } from '~/components/calendar/MonthHeader';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoChip } from '~/components/neo/NeoChip';
import { NeoInput } from '~/components/neo/NeoInput';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
import { PrivacyNote } from '~/components/PrivacyNote';
import { useSaveVote } from '~/hooks/useEvent';
import { useI18n } from '~/hooks/useI18n';
import { useSelectionStore } from '~/hooks/useSelectionStore';
import { ApiError } from '~/services/api';
import { errorMessage } from '~/services/errorMessage';
import { Heatmap } from './Heatmap';

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
  inspected: string | null;
  onInspect: (date: string) => void;
  onDraggingChange: (dragging: boolean) => void;
}

/** Answering and the group view for all-day events. Phase 4 adds the other two formats. */
export function Schedule({
  event,
  participants,
  rangeStart,
  rangeEnd,
  tab,
  onTabChange,
  month,
  onMonthChange,
  inspected,
  onInspect,
  onDraggingChange,
}: ScheduleProps) {
  const { lang, t } = useI18n();
  const { store, slots, outsideVersion } = useSelectionStore();
  const save = useSaveVote(event.slug, event.title);

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
  useEffect(() => {
    if (mineId === filledFor.current) return;
    filledFor.current = mineId;
    if (!mine) return;
    store.replace(mine.availability ?? mine.availableDates ?? []);
    onTabChange('heatmap');
  }, [mine, mineId, store, onTabChange]);

  const today = formatDateToISO(new Date());
  const selectable = event.dates.filter(date => date >= today);
  const days = buildMonthCells(month, rangeStart, rangeEnd, today);

  // Worked out on each render, so the message goes away as soon as the person fixes the problem.
  const problem = !name.trim() ? t('errorNameRequired') : slots.length === 0 ? t('errorSlotRequired') : null;

  const submit = () => {
    setJustSaved(false);
    if (problem) {
      save.reset();
      return setTriedSaving(true);
    }

    save.mutate(
      { participantId: mineId ?? undefined, name: name.trim(), note: note.trim(), availability: [...slots] },
      {
        onSuccess: () => {
          setJustSaved(true);
          onTabChange('heatmap');
        },
      },
    );
  };

  const saveError = save.error instanceof ApiError && save.error.status === 403 ? t('voteStaleError') : save.error ? errorMessage(save.error, t) : null;
  const shownError = triedSaving && problem ? problem : saveError;

  return (
    <View style={styles.schedule}>
      <View style={styles.tabs}>
        <NeoChip label={t('tabVote', { count: slots.length })} selected={tab === 'vote'} onPress={() => onTabChange('vote')} />
        <NeoChip label={t('tabHeatmap', { count: participants.length })} selected={tab === 'heatmap'} onPress={() => onTabChange('heatmap')} />
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
          inspected={inspected}
          onInspect={onInspect}
          onVoteFirst={() => onTabChange('vote')}
        />
      )}

      {tab === 'vote' && event.isClosed && <NeoNotice tone="sunken" message={t('votingClosedAlert')} />}

      {tab === 'vote' && !event.isClosed && (
        <NeoCard style={styles.card}>
          <NeoInput
            label={t('yourNameLabel')}
            placeholder={t('yourNamePlaceholder')}
            value={name}
            onChangeText={setNameDraft}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
          />
          {mine && <NeoText variant="caption">{t('editResponseNote')}</NeoText>}
          <NeoInput
            label={t('yourNoteLabel')}
            placeholder={t('yourNotePlaceholder')}
            value={note}
            onChangeText={setNoteDraft}
            maxLength={MAX_NOTE_LENGTH}
          />
          <PrivacyNote text={t('voteVisibilityNote')} />

          <NeoText variant="caption">{t('voteCalendarPrompt')}</NeoText>
          <View style={styles.shortcuts}>
            <NeoChip label={t('shortcutWeekendsOnly')} onPress={() => store.replace(new Set([...slots, ...selectable.filter(isWeekend)]))} />
            <NeoChip label={t('btnSelectAll')} onPress={() => store.replace(selectable)} />
            {slots.length > 0 && <NeoChip label={t('shortcutClearSelection')} onPress={() => store.replace([])} />}
          </View>

          <MonthHeader month={month} rangeStart={rangeStart} rangeEnd={rangeEnd} onChange={onMonthChange} />
          <DayGrid
            key={formatDateToISO(month)}
            days={days}
            store={store}
            outsideVersion={outsideVersion}
            labelFor={day => formatLocalizedDate(day.dateStr, lang, 'chip')}
            onDraggingChange={onDraggingChange}
          />

          {shownError && <NeoNotice message={shownError} />}

          <NeoText variant="monoBold">{t('selectedDaysCount', { count: slots.length })}</NeoText>
          <NeoButton
            fullWidth
            label={save.isPending ? t('savingDataBtn') : t('saveMyAvailabilityBtn')}
            disabled={save.isPending}
            onPress={submit}
          />
        </NeoCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  schedule: { gap: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { padding: 12, gap: 12 },
});
