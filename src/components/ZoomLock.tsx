'use client';

import { useEffect } from 'react';

/** iOS Safari ignores user-scalable=no, but still lets a page cancel its pinch gesture. */
export default function ZoomLock() {
  useEffect(() => {
    const preventZoom = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', preventZoom, { passive: false });
    return () => document.removeEventListener('gesturestart', preventZoom);
  }, []);

  return null;
}
