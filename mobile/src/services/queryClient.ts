import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { shouldRetryRequest } from './api';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: shouldRetryRequest } },
});

// React Query only knows browser focus events on its own. This refetches on returning to the app.
focusManager.setEventListener(setFocused => {
  const subscription = AppState.addEventListener('change', state => setFocused(state === 'active'));
  return () => subscription.remove();
});
