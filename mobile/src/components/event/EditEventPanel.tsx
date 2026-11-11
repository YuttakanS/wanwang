import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatDateToISO, formatLocalizedDateRange } from '@/lib/timeUtils';
import { EVENT_CATEGORIES, type EventCategory, type WanWangEvent } from '@/types';
import type { DateRange } from '~/calendar/rangePick';
import { RangeCalendar } from '~/components/calendar/RangeCalendar';
import { ChoiceGrid } from '~/components/create/Choices';
import { RangeSummary } from '~/components/create/RangeSummary';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoInput } from '~/components/neo/NeoInput';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
import { MAX_DESCRIPTION_LENGTH, MAX_LOCATION_LENGTH, MAX_TITLE_LENGTH } from '~/constants/limits';
import { CATEGORY_LABEL_KEYS } from '~/constants/strings';
import type { useAdminActions } from '~/hooks/useAdminActions';
import { useI18n } from '~/hooks/useI18n';
import { buildEventPatch, editEventProblem, initialEventRange } from '~/services/editEvent';

interface EditEventPanelProps {
  event: WanWangEvent;
  /** Once anyone has answered, the server only lets the range grow, so their slots stay valid. */
  hasVotes: boolean;
  /** The manage panel's own, so its other buttons wait for a save and it shows the save's error. */
  update: ReturnType<typeof useAdminActions>['update'];
  /** True while any organizer action is running, such as a key rotation the save would race. */
  busy: boolean;
  onDone: () => void;
}

/** The website's edit form: text, category and date range. The time format stays as created. */
export function EditEventPanel({ event, hasVotes, update, busy, onDone }: EditEventPanelProps) {
  const { lang, t } = useI18n();

  const today = formatDateToISO(new Date());
  const initial = initialEventRange(event, today);

  const [title, setTitle] = useState(event.title);
  const [location, setLocation] = useState(event.location ?? '');
  const [description, setDescription] = useState(event.description ?? '');
  const [category, setCategory] = useState<EventCategory>(event.category);
  const [range, setRange] = useState<DateRange>(initial);
  const [triedSaving, setTriedSaving] = useState(false);

  const form = { title, location, description, category, range };
  // Worked out on each render, so the message goes away as soon as the person fixes the problem.
  const problem = editEventProblem(form, event, hasVotes, today);
  const shownProblem = triedSaving ? problem : null;

  const save = () => {
    if (problem) {
      update.reset();
      return setTriedSaving(true);
    }
    const patch = buildEventPatch(form, event, today);
    if (Object.keys(patch).length === 0) return onDone();
    update.mutate(patch, { onSuccess: onDone });
  };

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
      <RangeCalendar range={range} today={today} minDate={initial.start < today ? initial.start : today} onChange={setRange} />
      <RangeSummary
        label={range.end ? t('rangeSummaryLabel') : ''}
        text={range.end ? formatLocalizedDateRange(range.start, range.end, lang) : t('rangePickEnd')}
      />
      <NeoText variant="caption" tone="muted">
        {/* Not twice when the notice below already says it. */}
        {hasVotes && shownProblem?.key !== 'editRangeExpandOnly' ? t('editRangeExpandOnly') : t('rangePickHint')}
      </NeoText>
      {shownProblem && <NeoNotice message={t(shownProblem.key, shownProblem.params)} />}
      <View style={styles.buttons}>
        <NeoButton
          label={update.isPending ? t('savingChangesBtn') : t('saveChangesBtn')}
          size="sm"
          disabled={busy}
          onPress={save}
        />
        <NeoButton label={t('confirmCancelBtn')} variant="secondary" size="sm" disabled={busy} onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
