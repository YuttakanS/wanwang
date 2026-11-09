import { useState } from 'react';

/** The spinner follows the person's pull only, not the refetch that runs on returning to the app. */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  };
  return { refreshing, onRefresh };
}
