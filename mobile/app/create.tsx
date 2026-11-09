import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { countEventSlots, formatDateToISO, formatLocalizedDateRange, generateDatesInRange } from '@/lib/timeUtils';
import { EVENT_CATEGORIES, type EventCategory, MAX_EVENT_SLOTS, type TimeGranularity } from '@/types';
import type { DateRange } from '~/calendar/rangePick';
import { RangeCalendar } from '~/components/calendar/RangeCalendar';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoChip } from '~/components/neo/NeoChip';
import { NeoInput } from '~/components/neo/NeoInput';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
import { PrivacyNote } from '~/components/PrivacyNote';
import { Screen } from '~/components/Screen';
import { TimeStepper } from '~/components/TimeStepper';
import { CATEGORY_LABEL_KEYS } from '~/constants/strings';
import { useI18n } from '~/hooks/useI18n';
import { useCreateEvent } from '~/hooks/useMyEvents';
import { errorMessage } from '~/services/errorMessage';

// The API's limits, in LIMITS in src/lib/validation.ts, which cannot be imported here because it uses crypto.
const MAX_TITLE_LENGTH = 100;
const MAX_LOCATION_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_RANGE_DAYS = 366;

// `days` is added to the start date, so the inclusive count is days + 1. Same presets as the website.
const RANGE_PRESETS = [
  { days: 14, labelKey: 'rangePreset2Weeks' },
  { days: 30, labelKey: 'rangePreset1Month' },
  { days: 60, labelKey: 'rangePreset2Months' },
  { days: 365, labelKey: 'rangePreset1Year' },
];
const DEFAULT_RANGE_DAYS = 365;

const FORMATS: { id: TimeGranularity; labelKey: string; descriptionKey: string }[] = [
  { id: 'day', labelKey: 'granularityDay', descriptionKey: 'granularityDayDesc' },
  { id: 'daypart', labelKey: 'granularityDaypart', descriptionKey: 'granularityDaypartDesc' },
  { id: 'hour', labelKey: 'granularityHour', descriptionKey: 'granularityHourDesc' },
];

const hourText = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
const START_TIMES = Array.from({ length: 24 }, (_, hour) => hourText(hour));
// The API's times stop at 23:59, which stands for midnight, as on the website.
const END_TIMES = [...Array.from({ length: 23 }, (_, hour) => hourText(hour + 1)), '23:59'];

function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateToISO(date);
}

export default function CreateScreen() {
  const { lang, t } = useI18n();
  const router = useRouter();
  const create = useCreateEvent();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('hangout');
  const [range, setRange] = useState<DateRange>(() => ({ start: isoDaysFromToday(0), end: isoDaysFromToday(DEFAULT_RANGE_DAYS) }));
  const [granularity, setGranularity] = useState<TimeGranularity>('day');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('22:00');
  const [slotInterval, setSlotInterval] = useState(60);
  const [triedSaving, setTriedSaving] = useState(false);
  // Changes with each preset, so the calendar opens on the range it just set.
  const [calendarKey, setCalendarKey] = useState(0);

  const today = isoDaysFromToday(0);
  const dayCount = range.end ? generateDatesInRange(range.start, range.end).length : 0;

  // Worked out on each render, so the message goes away as soon as the person fixes the problem.
  const problem = !title.trim()
    ? t('formErrorTitle')
    : !range.end
      ? t('rangePickEnd')
      : dayCount > MAX_RANGE_DAYS
        ? t('rangeTooLong', { max: MAX_RANGE_DAYS })
        : granularity === 'hour' && startTime >= endTime
          ? t('timeWindowInvalid')
          : countEventSlots(granularity, dayCount, startTime, endTime, slotInterval) > MAX_EVENT_SLOTS
            ? t('formErrorTooManySlots')
            : null;

  const submit = () => {
    if (problem || !range.end) {
      create.reset();
      return setTriedSaving(true);
    }

    create.mutate(
      {
        title: title.trim(),
        location: location.trim(),
        description: description.trim(),
        category,
        granularity,
        dateRangeStart: range.start,
        dateRangeEnd: range.end,
        ...(granularity === 'hour' ? { startTime, endTime, slotInterval } : {}),
      },
      { onSuccess: slug => router.replace({ pathname: '/e/[slug]', params: { slug, created: '1' } }) },
    );
  };

  const shownError = triedSaving && problem ? problem : create.error ? errorMessage(create.error, t) : null;

  return (
    <Screen showBack>
      <NeoText variant="title" accessibilityRole="header">
        {t('createTitle')}
      </NeoText>

      <NeoCard style={styles.card}>
        <NeoText variant="heading" accessibilityRole="header">
          {t('step1Title')}
        </NeoText>
        <NeoInput
          label={t('eventNameLabel')}
          placeholder={t('eventNamePlaceholder')}
          value={title}
          onChangeText={setTitle}
          maxLength={MAX_TITLE_LENGTH}
        />
        <NeoText variant="label">{t('categoryLabel')}</NeoText>
        <View style={styles.chips}>
          {EVENT_CATEGORIES.map(item => (
            <NeoChip key={item.id} label={t(CATEGORY_LABEL_KEYS[item.id])} selected={category === item.id} onPress={() => setCategory(item.id)} />
          ))}
        </View>
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
      </NeoCard>

      <NeoCard style={styles.card}>
        <NeoText variant="heading" accessibilityRole="header">
          {t('step2RangeTitle')}
        </NeoText>
        <NeoText variant="caption" tone="muted">
          {t('step2RangeSubtitle')}
        </NeoText>
        <View style={styles.chips}>
          {RANGE_PRESETS.map(preset => {
            const end = isoDaysFromToday(preset.days);
            return (
              <NeoChip
                key={preset.days}
                label={t(preset.labelKey)}
                selected={range.start === today && range.end === end}
                onPress={() => {
                  setRange({ start: today, end });
                  setCalendarKey(key => key + 1);
                }}
              />
            );
          })}
        </View>
        <NeoText variant="caption" accessibilityLiveRegion="polite">
          {range.end
            ? t('rangeDaysCount', { count: dayCount, range: formatLocalizedDateRange(range.start, range.end, lang) })
            : t('rangePickEnd')}
        </NeoText>
        <RangeCalendar key={calendarKey} range={range} today={today} onChange={setRange} />
        <NeoText variant="caption" tone="muted">
          {t('rangePickHint')}
        </NeoText>
      </NeoCard>

      <NeoCard style={styles.card}>
        <NeoText variant="heading" accessibilityRole="header">
          {t('step3Title')}
        </NeoText>
        <View style={styles.chips}>
          {FORMATS.map(format => (
            <NeoChip key={format.id} label={t(format.labelKey)} selected={granularity === format.id} onPress={() => setGranularity(format.id)} />
          ))}
        </View>
        <NeoText variant="caption" tone="muted">
          {t(FORMATS.find(format => format.id === granularity)?.descriptionKey ?? 'granularityDayDesc')}
        </NeoText>
        {granularity === 'hour' && (
          <>
            <TimeStepper label={t('startHourLabel')} options={START_TIMES} value={startTime} onChange={setStartTime} />
            <TimeStepper
              label={t('endHourLabel')}
              options={END_TIMES}
              value={endTime}
              textFor={time => (time === '23:59' ? t('midnight') : time)}
              onChange={setEndTime}
            />
            <NeoText variant="label">{t('intervalLabel')}</NeoText>
            <View style={styles.chips}>
              <NeoChip label={t('interval60')} selected={slotInterval === 60} onPress={() => setSlotInterval(60)} />
              <NeoChip label={t('interval30')} selected={slotInterval === 30} onPress={() => setSlotInterval(30)} />
            </View>
          </>
        )}
      </NeoCard>

      <PrivacyNote text={t('createVisibilityNote')} />
      {shownError && <NeoNotice message={shownError} />}
      <NeoButton fullWidth label={create.isPending ? t('submitCreating') : t('submitBtn')} disabled={create.isPending} onPress={submit} />
      <NeoText variant="caption" tone="muted">
        {t('formFooterNote')}
      </NeoText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
