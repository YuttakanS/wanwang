import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatDateToISO } from '@/lib/timeUtils';
import { firstOfMonth, initialMonth } from '~/calendar/monthPaging';
import { AdminLinkNotice } from '~/components/event/AdminLinkNotice';
import { BestTimes } from '~/components/event/BestTimes';
import { EventHeader } from '~/components/event/EventHeader';
import { Roster } from '~/components/event/Roster';
import { Schedule, type ScheduleTab } from '~/components/event/Schedule';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { Screen, type ScreenScrollView } from '~/components/Screen';
import { StatusScreen } from '~/components/StatusScreen';
import { useEvent } from '~/hooks/useEvent';
import { useI18n } from '~/hooks/useI18n';
import { useMyEvents, useMyEventsActions } from '~/hooks/useMyEvents';
import { usePullToRefresh } from '~/hooks/usePullToRefresh';
import { ApiError, type EventDetails } from '~/services/api';
import { buildEventUrl, isValidSlug } from '~/services/deepLink';
import { errorMessage } from '~/services/errorMessage';

function NotFound({ slug }: { slug: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { forget } = useMyEventsActions();
  const isListed = useMyEvents().data?.some(event => event.slug === slug) ?? false;

  return (
    <StatusScreen title={t('notFoundTitle')} description={t('notFoundDesc')}>
      <NeoButton label={t('returnHomeBtn')} size="sm" onPress={() => router.dismissTo('/')} />
      {isListed && (
        <NeoButton
          label={t('notFoundRemove')}
          variant="secondary"
          size="sm"
          onPress={() => {
            void forget(slug);
            router.dismissTo('/');
          }}
        />
      )}
    </StatusScreen>
  );
}

interface EventDetailProps {
  details: EventDetails;
  refetchError: Error | null;
  refetch: () => Promise<unknown>;
  justCreated: boolean;
  adminLinkInvalid: boolean;
}

function EventDetail({ details, refetchError, refetch, justCreated, adminLinkInvalid }: EventDetailProps) {
  const { t } = useI18n();
  const { event, participants, isAdmin } = details;
  const pull = usePullToRefresh(refetch);

  const today = formatDateToISO(new Date());
  const rangeStart = event.dateRangeStart || event.dates[0] || today;
  const rangeEnd = event.dateRangeEnd || event.dates[event.dates.length - 1] || rangeStart;

  const [tab, setTab] = useState<ScheduleTab>('vote');
  const [month, setMonth] = useState(() => initialMonth(rangeStart, rangeEnd, today));
  const [inspected, setInspected] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showAdminNotice, setShowAdminNotice] = useState(justCreated);

  const scrollRef = useRef<ScreenScrollView>(null);
  const scheduleY = useRef(0);

  const isDayEvent = (event.granularity || 'day') === 'day';

  // The best times sit below the calendar, so bring the chosen day into view.
  const showDate = (date: string) => {
    setTab('heatmap');
    setMonth(firstOfMonth(date));
    setInspected(date);
    scrollRef.current?.scrollTo({ y: scheduleY.current, animated: true });
  };

  return (
    <Screen showBack scrollRef={scrollRef} scrollEnabled={!dragging} refreshing={pull.refreshing} onRefresh={pull.onRefresh}>
      {refetchError && <NeoNotice message={errorMessage(refetchError, t)} />}
      {adminLinkInvalid && <NeoNotice message={t('adminLinkInvalidMsg')} />}
      {showAdminNotice && isAdmin && event.adminKey ? (
        <AdminLinkNotice slug={event.slug} adminKey={event.adminKey} onDismiss={() => setShowAdminNotice(false)} />
      ) : null}

      <EventHeader event={event} participants={participants} isAdmin={isAdmin} onAdminKeyRotated={() => setShowAdminNotice(true)} />

      <View
        style={styles.section}
        onLayout={layoutEvent => {
          scheduleY.current = layoutEvent.nativeEvent.layout.y;
        }}
      >
        {isDayEvent ? (
          <Schedule
            event={event}
            participants={participants}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            tab={tab}
            onTabChange={setTab}
            month={month}
            onMonthChange={setMonth}
            inspected={inspected}
            onInspect={setInspected}
            onDraggingChange={setDragging}
          />
        ) : (
          <>
            <NeoNotice tone="sunken" message={t('formatComingSoon')} />
            <NeoButton
              label={t('openOnWebBtn')}
              variant="secondary"
              size="sm"
              onPress={() => void WebBrowser.openBrowserAsync(buildEventUrl(event.slug)).catch(() => {})}
            />
          </>
        )}
      </View>

      <BestTimes event={event} participants={participants} isAdmin={isAdmin} onSelect={isDayEvent ? showDate : undefined} />
      <Roster slug={event.slug} participants={participants} isAdmin={isAdmin} />
    </Screen>
  );
}

export default function EventScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { slug, created, invalidAdmin } = useLocalSearchParams<{ slug: string; created?: string; invalidAdmin?: string }>();
  const query = useEvent(slug);

  if (!isValidSlug(slug) || (query.error instanceof ApiError && query.error.status === 404)) {
    return <NotFound slug={String(slug)} />;
  }

  if (!query.data) {
    if (!query.isError) return <StatusScreen title={t('appLoading')} />;
    return (
      <StatusScreen title={t('errorTitle')} description={errorMessage(query.error, t)}>
        <NeoButton label={t('retryBtn')} size="sm" onPress={() => void query.refetch()} />
        <NeoButton label={t('returnHomeBtn')} variant="secondary" size="sm" onPress={() => router.dismissTo('/')} />
      </StatusScreen>
    );
  }

  return (
    <EventDetail
      key={slug}
      details={query.data}
      refetchError={query.error}
      refetch={query.refetch}
      justCreated={created === '1'}
      adminLinkInvalid={invalidAdmin === '1'}
    />
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
});
