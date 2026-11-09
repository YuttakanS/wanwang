import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';

const DONE_MS = 2000;

/** `copied` names what was just copied, for a brief "done" label. `failedText` is left to copy by hand. */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const [failedText, setFailedText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async (id: string, text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setFailedText(null);
      setCopied(id);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), DONE_MS);
    } catch {
      setFailedText(text);
    }
  };

  return { copied, failedText, copy };
}
