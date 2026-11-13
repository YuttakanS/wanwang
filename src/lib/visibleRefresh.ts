/**
 * Calls `refresh` every `intervalMs` while the page is visible, and once more as soon as it becomes
 * visible again (tab switch, phone unlocked). Nothing runs while hidden, so a tab left open in the
 * background costs no requests. Returns a function that stops it.
 */
export function startVisibleRefresh(refresh: () => void, intervalMs: number): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;

  const stopTimer = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const startTimer = () => {
    stopTimer();
    timer = setInterval(refresh, intervalMs);
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      refresh();
      startTimer();
    } else {
      stopTimer();
    }
  };

  if (document.visibilityState === 'visible') startTimer();
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    stopTimer();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
