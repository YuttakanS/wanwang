import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { countEventSlots, formatDateToISO, formatLocalizedDateRange, generateDatesInRange } from '@/lib/timeUtils';
import { EVENT_CATEGORIES, type EventCategory, MAX_EVENT_SLOTS, type WanWangEvent } from '@/types';
import type { DateRange } from '~/calendar/rangePick';
import { RangeCalendar } from '~/components/calendar/RangeCalendar';
import { ChoiceGrid } from '~/components/create/Choices';
import { RangeSummary } from '~/components/create/RangeSummary';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoInput } from '~/components/neo/NeoInput';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
import { MAX_DESCRIPTION_LENGTH, MAX_LOCATION_LENGTH, MAX_RANGE_DAYS, MAX_TITLE_LENGTH } from '~/constants/limits';
import { CATEGORY_LABEL_KEYS } from '~/constants/strings';
import { useAdminActions } from '~/hooks/useAdminActions';
import { useI18n } from '~/hooks/useI18n';
import type { EventPatch } from '~/services/api';
import { errorMessage } from '~/services/errorMessage';

interface EditEventPanelProps {
  event: WanWangEvent;
  /** Once anyone has answered, the server only lets the range grow, so their slots stay valid. */
  hasVotes: boolean;
  onDone: () => void;
  onAdminLost: () => void;
}

/** The website's edit form: text, category and date range. The time format stays as created. */
export function EditEventPanel({ event, hasVotes, onDone, onAdminLost }: EditEventPanelProps) {
  const { lang, t } = useI18n();
  const { update } = useAdminActions(event.slug, onAdminLost);

  const today = formatDateToISO(new Date());
  const initialStart = event.dateRangeStart || event.dates[0] || today;
  const initialEnd = event.dateRangeEnd || event.dates[event.dates.length - 1] || initialStart;

  const [title, setTitle] = useState(event.title);
  const [location, setLocation] = useState(event.location ?? '');
  const [description, setDescription] = useState(event.description ?? '');
  const [category, setCategory] = useState<EventCategory>(event.category);
  const [range, setRange] = useState<DateRange>({ start: initialStart, end: initialEnd });
  const [triedSaving, setTriedSaving] = useState(false);

  const dayCount = range.end ? generateDatesInRange(range.start, range.end).length : 0;
  const shrinks = hasVotes && range.end !== null && (range.start > initialStart || range.end < initialEnd);

  // Worked out on each render, so the message goes away as soon as the person fixes the problem.
  const problem = !title.trim()
    ? t('formErrorTitle')
    : !range.end
      ? t('rangePickEnd')
      : dayCount > MAX_RANGE_DAYS
        ? t('rangeTooLong', { max: MAX_RANGE_DAYS })
        : shrinks
          ? t('editRangeExpandOnly')
          : countEventSlots(event.granularity || 'day', dayCount, event.startTime, event.endTime, event.slotInterval) > MAX_EVENT_SLOTS
            ? t('formErrorTooManySlots')
            : null;

  const save = () => {
    if (problem || !range.end) {
      update.reset();
      return setTriedSaving(true);
    }
    const patch: EventPatch = {};
    if (title.trim() !== event.title) patch.title = title.trim();
    if (location.trim() !== (event.location ?? '')) patch.location = location.trim();
    if (description.trim() !== (event.description ?? '')) patch.description = description.trim();
    if (category !== event.category) patch.category = category;
    // The API takes the range only as a pair.
    if (range.start !== initialStart || range.end !== initialEnd) {
      patch.dateRangeStart = range.start;
      patch.dateRangeEnd = range.end;
    }
    if (Object.keys(patch).length === 0) return onDone();
    update.mutate(patch, { onSuccess: onDone });
  };

  const shownError = triedSaving && problem ? problem : update.error ? errorMessage(update.error, t) : null;

  return (
    <View style={styles.panel}>
      <NeoText variant="heading" accessibilityRole="header">
        {t('editEventTitle')}
      </NeoText>
      <NeoInput label={t('eventNameLabel')} value={title} onChangeText={setTitle} maxLength={MAX_TITLE_LENGTH} />
      <ChoiceGrid
        label={t('categoryLabel')}
        options={EVENT_CATEGORIES.map(item => ({ value: item.id, label: t(CATEGORY_LABEL_KEYS[item.id]) }))}
        value={category}
        onChange={setCategory}
      />
      <NeoInput
        label={t('locationLabel')}
        placeholder={t('locationPlaceholder')}
        value={location}
        onChangeText={setLocation}
        maxLength={MAX_LOCATION_LENGTH}
      />
      <NeoInput
        label={t('notesLabel')}
        placeholder={t('notesPlaceholder')}
        value={description}
        onChangeText={setDescription}
        maxLength={MAX_DESCRIPTION_LENGTH}
      />
      <RangeCalendar range={range} today={today} minDate={initialStart < today ? initialStart : today} onChange={setRange} />
      <RangeSummary
        label={range.end ? t('rangeSummaryLabel') : ''}
        text={range.end ? formatLocalizedDateRange(range.start, range.end, lang) : t('rangePickEnd')}
      />
      <NeoText variant="caption" tone="muted">
        {hasVotes ? t('editRangeExpandOnly') : t('rangePickHint')}
      </NeoText>
      {shownError && <NeoNotice message={shownError} />}
      <View style={styles.buttons}>
        <NeoButton
          label={update.isPending ? t('savingChangesBtn') : t('saveChangesBtn')}
          size="sm"
          disabled={update.isPending}
          onPress={save}
        />
        <NeoButton label={t('confirmCancelBtn')} variant="secondary" size="sm" disabled={update.isPending} onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
