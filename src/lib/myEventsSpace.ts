import { ADMIN_PREFIX, listStoredAdminKeys } from '@/lib/adminAccess';

// "My events" comes from this browser's storage and a server lookup, so it appears after the page
// has painted and pushes the form down. The height it had last time is kept here, one per layout
// (items stack below Tailwind's `sm`, 640px), and the script below reserves it in <head> before the
// first paint. The number of stored admin keys is kept with it, and space is reserved only while
// that number is unchanged, since another event makes the list taller or shorter. The key must
// not start with ADMIN_PREFIX, which listStoredAdminKeys scans.
const HEIGHT_KEY = 'wanwang_my_events_height';
const WIDE_QUERY = '(min-width: 640px)';

// n and w: heights below and from 640px. k: how many admin keys were stored when they were saved.
type Heights = { n?: number; w?: number; k?: number };

export const MY_EVENTS_SPACE_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('${HEIGHT_KEY}')||'{}'),h=s&&s[matchMedia('${WIDE_QUERY}').matches?'w':'n'],k=0;for(var i=0;i<localStorage.length;i++)if((localStorage.key(i)||'').indexOf('${ADMIN_PREFIX}')===0)k++;if(k>0&&s.k===k&&h>0){var r=document.documentElement;r.style.setProperty('--my-events-height',h+'px');r.dataset.myEvents=''}}catch(e){}})();`;

function readHeights(): Heights {
  try {
    const parsed = JSON.parse(localStorage.getItem(HEIGHT_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function currentSlot(): 'n' | 'w' {
  return window.matchMedia(WIDE_QUERY).matches ? 'w' : 'n';
}

/** Sets this page's reservation, which the <head> script set when the document loaded. */
function reserve(height: number | undefined): void {
  const root = document.documentElement;
  if (height && height > 0) {
    root.style.setProperty('--my-events-height', `${height}px`);
    root.dataset.myEvents = '';
  } else {
    root.style.removeProperty('--my-events-height');
    delete root.dataset.myEvents;
  }
}

/**
 * Brings the reservation up to date for a return to the home page without a reload: events may
 * have been added or deleted, or the window resized, since the document loaded.
 */
export function dropStaleMyEventsSpace(): void {
  const keys = listStoredAdminKeys().length;
  const heights = readHeights();
  if (keys === 0 || heights.k !== keys) rememberMyEventsHeight(0);
  else reserve(heights[currentSlot()]);
}

/**
 * Keeps the list's height for the next visit; 0 means nothing was shown, so nothing is reserved.
 * The page's own reservation is updated too.
 */
export function rememberMyEventsHeight(px: number): void {
  const height = Math.round(px);
  reserve(height);
  try {
    if (height > 0) {
      const slot = currentSlot();
      const keys = listStoredAdminKeys().length;
      // The other width's height is kept only while the list is unchanged: same keys, and this
      // width's height new or the same (hiding events changes it without changing the keys).
      const kept = readHeights();
      const unchanged = kept.k === keys && (kept[slot] === undefined || kept[slot] === height);
      const heights: Heights = unchanged ? { ...kept } : {};
      localStorage.setItem(HEIGHT_KEY, JSON.stringify({ ...heights, k: keys, [slot]: height }));
    } else {
      localStorage.removeItem(HEIGHT_KEY);
    }
  } catch {
    // Storage blocked: the list just appears without reserved space, as before.
  }
}
