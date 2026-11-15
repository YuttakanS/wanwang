'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  LED_OFF_COLOR,
  LED_ROWS,
  LED_SPEED,
  copyStarts,
  ledColor,
  stripColumns,
} from '@/lib/ledSign';

interface LedSignProps {
  text: string;
  color: string;
  /** Inside the editor, where the form already gives screen readers the text. */
  preview?: boolean;
}

/** Canvas pixels sampled per LED side when the text is turned into LEDs. */
const SAMPLES = 4;
/** An LED lights when the letter covers this much of it. */
const LIT_COVERAGE = 0.4;
/** Tall Thai marks and deep tails, so every message gets the same letter size. */
const TALLEST_TEXT = 'ปี่ป๊ฏูฎูÁy';
/** Wider than this and some browsers hand back a blank canvas. 120 of the widest Latin letters need 9,204. */
const MAX_SOURCE_WIDTH = 16000;

/**
 * 'scroll' moves the text. People who asked for reduced motion get 'still' when the whole text
 * fits on the sign, and otherwise 'plain': ordinary text, so nothing is cut off. 'plain' is also
 * what shows when the text cannot be turned into LEDs.
 */
type Mode = 'scroll' | 'still' | 'plain';

/** The text as a tiny image, one pixel per LED: opaque where the LED is lit. */
function rasterizeText(text: string, fontFamily: string): HTMLCanvasElement | null {
  const source = document.createElement('canvas');
  const g = source.getContext('2d', { willReadFrequently: true });
  if (!g) return null;

  const height = LED_ROWS * SAMPLES;
  g.font = `700 100px ${fontFamily}`;
  const tallest = g.measureText(TALLEST_TEXT + text);
  const ascent = tallest.actualBoundingBoxAscent;
  const descent = tallest.actualBoundingBoxDescent;
  if (!(ascent + descent > 0)) return null;
  // One row of unlit LEDs above and below.
  const scale = (height - 2 * SAMPLES) / (ascent + descent);
  const font = `700 ${100 * scale}px ${fontFamily}`;
  g.font = font;
  // One column of unlit LEDs on each side, for letters that reach past their own box.
  const cols = Math.ceil(g.measureText(text).width / SAMPLES) + 2;
  if (cols * SAMPLES > MAX_SOURCE_WIDTH) return null;

  source.width = cols * SAMPLES;
  source.height = height;
  g.font = font;
  g.fillStyle = '#fff';
  g.fillText(text, SAMPLES, SAMPLES + ascent * scale);
  const pixels = g.getImageData(0, 0, source.width, height).data;

  const bitmap = document.createElement('canvas');
  bitmap.width = cols;
  bitmap.height = LED_ROWS;
  const out = bitmap.getContext('2d');
  if (!out) return null;
  const image = out.createImageData(cols, LED_ROWS);
  const litAt = LIT_COVERAGE * 255 * 255 * SAMPLES * SAMPLES;
  for (let row = 0; row < LED_ROWS; row++) {
    for (let col = 0; col < cols; col++) {
      let coverage = 0;
      for (let y = 0; y < SAMPLES; y++) {
        const line = ((row * SAMPLES + y) * source.width + col * SAMPLES) * 4;
        for (let x = 0; x < SAMPLES; x++) {
          const p = line + x * 4;
          // Letters are drawn white. An emoji brings its own colours, and its dark parts (eyes,
          // outlines) stay unlit, or it would be one solid shape.
          coverage += pixels[p + 3] * Math.max(pixels[p], pixels[p + 1], pixels[p + 2]);
        }
      }
      if (coverage >= litAt) image.data[(row * cols + col) * 4 + 3] = 255;
    }
  }
  out.putImageData(image, 0, 0);
  return bitmap;
}

/** One LED, repeated across the sign. Small LEDs are squares: a circle that size is a blur. */
function ledPattern(ctx: CanvasRenderingContext2D, pitch: number, color: string): CanvasPattern | null {
  const tile = document.createElement('canvas');
  tile.width = pitch;
  tile.height = pitch;
  const g = tile.getContext('2d');
  if (!g) return null;
  g.fillStyle = color;
  if (pitch < 4) {
    g.fillRect(0, 0, pitch - 1, pitch - 1);
  } else {
    g.beginPath();
    g.arc(pitch / 2, pitch / 2, pitch * 0.42, 0, Math.PI * 2);
    g.fill();
  }
  return ctx.createPattern(tile, 'repeat');
}

export default function LedSign({ text, color, preview = false }: LedSignProps) {
  const { t } = useI18n();
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>('scroll');
  const [paused, setPaused] = useState(false);
  const litColor = ledColor(color);

  // What the running sign reads, and how it is told that one of them changed. A new colour or a
  // pause must not start the text again from the beginning, so neither restarts the effect below.
  const live = useRef({ color: litColor, paused, refresh: () => {} });

  // Before the first paint, so the canvas never shows at its default size and then jumps.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!frame || !canvas || !ctx) {
      setMode('plain');
      return;
    }

    const state = live.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let pixelRatioQuery: MediaQueryList | null = null;
    let bitmap: HTMLCanvasElement | null = null;
    /** The text could not be turned into LEDs, so it is shown as ordinary text. */
    let unreadable = false;
    let pitch = 0;
    let viewCols = 0;
    let lit: CanvasPattern | null = null;
    let off: CanvasPattern | null = null;
    let still = false;
    let position = 0;
    let onScreen = true;
    let lastTime = 0;
    let frameRequest = 0;
    let disposed = false;

    const draw = () => {
      const { width, height } = canvas;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, width, height);
      if (bitmap && lit) {
        const textCols = bitmap.width;
        const starts = still
          ? [Math.floor((viewCols - textCols) / 2)]
          : copyStarts(Math.floor(position), stripColumns(textCols, viewCols), viewCols);
        // Each pixel of the text becomes a square the size of one LED...
        ctx.imageSmoothingEnabled = false;
        for (const start of starts) ctx.drawImage(bitmap, start * pitch, 0, textCols * pitch, height);
        // ...and the squares are then cut down to the LEDs inside them.
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = lit;
        ctx.fillRect(0, 0, width, height);
      }
      if (off) {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = off;
        ctx.fillRect(0, 0, width, height);
      }
    };

    const isMoving = () => Boolean(bitmap) && !still && onScreen && !state.paused;

    const tick = (time: number) => {
      frameRequest = 0;
      if (!bitmap || !isMoving()) return;
      // A long gap means the tab was in the background; the text carries on from where it was.
      const elapsed = Math.max(0, Math.min(time - lastTime, 100));
      lastTime = time;
      const column = Math.floor(position);
      position = (position + (elapsed / 1000) * LED_SPEED) % stripColumns(bitmap.width, viewCols);
      if (Math.floor(position) !== column) draw();
      frameRequest = requestAnimationFrame(tick);
    };

    /** Frames are asked for only while the text is moving. */
    const run = () => {
      if (frameRequest || !isMoving()) return;
      lastTime = performance.now();
      frameRequest = requestAnimationFrame(tick);
    };

    const layOut = () => {
      const available = frame.clientWidth;
      if (available <= 0) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      // A whole number of screen pixels per LED, or the LEDs come out uneven.
      pitch = Math.max(2, Math.round((available < 480 ? 2.5 : 3) * pixelRatio));
      viewCols = Math.max(1, Math.floor((available * pixelRatio) / pitch));
      canvas.width = viewCols * pitch;
      canvas.height = LED_ROWS * pitch;
      canvas.style.width = `${canvas.width / pixelRatio}px`;
      canvas.style.height = `${canvas.height / pixelRatio}px`;
      lit = ledPattern(ctx, pitch, state.color);
      off = ledPattern(ctx, pitch, LED_OFF_COLOR);

      const fits = !bitmap || bitmap.width <= viewCols;
      still = reducedMotion.matches;
      setMode(unreadable ? 'plain' : !still ? 'scroll' : fits ? 'still' : 'plain');
      draw();
      run();
    };

    // Zooming, or moving the window to another screen, changes the pixels per LED without
    // changing the sign's width, so the resize observer does not see it.
    const watchPixelRatio = () => {
      pixelRatioQuery?.removeEventListener('change', onPixelRatioChange);
      pixelRatioQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      pixelRatioQuery.addEventListener('change', onPixelRatioChange);
    };
    const onPixelRatioChange = () => {
      watchPixelRatio();
      layOut();
    };

    const fontFamily = getComputedStyle(frame).fontFamily;
    const lightUp = () => {
      bitmap = rasterizeText(text, fontFamily);
      unreadable = !bitmap;
      layOut();
    };

    // The site's font may still be on its way; until it is here the sign stays unlit. Only that
    // first font is waited for: the ones after it are system fonts, every device lacks some of
    // them, and asking for the whole list fails at once.
    const webFont = `700 32px ${fontFamily.split(',')[0]}`;
    if (!document.fonts?.check || document.fonts.check(webFont, text)) {
      lightUp();
    } else {
      layOut();
      document.fonts
        .load(webFont, text)
        .catch(() => undefined)
        .then(() => {
          if (!disposed) lightUp();
        });
    }

    const resizeObserver = new ResizeObserver(layOut);
    resizeObserver.observe(frame);
    // Nothing moves while the sign is scrolled out of view.
    const visibilityObserver = new IntersectionObserver(entries => {
      onScreen = entries[entries.length - 1].isIntersecting;
      run();
    });
    visibilityObserver.observe(frame);
    reducedMotion.addEventListener('change', layOut);
    watchPixelRatio();
    state.refresh = layOut;

    return () => {
      disposed = true;
      state.refresh = () => {};
      cancelAnimationFrame(frameRequest);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      reducedMotion.removeEventListener('change', layOut);
      pixelRatioQuery?.removeEventListener('change', onPixelRatioChange);
    };
  }, [text]);

  // After the effect above, so a text and a colour that change together are drawn once, correctly.
  useLayoutEffect(() => {
    live.current.color = litColor;
    live.current.paused = paused;
    live.current.refresh();
  }, [litColor, paused]);

  return (
    <section
      aria-label={t(preview ? 'ledSignPreviewLabel' : 'ledSignLabel')}
      className="flex items-stretch bg-[#0a0a0a] border-4 border-ink"
    >
      <div className="flex-1 min-w-0 p-2 sm:p-3">
        {/* Measured for the canvas, so it has no padding of its own. */}
        <div ref={frameRef} className="font-sans">
          {!preview && <p className="sr-only">{text}</p>}
          <canvas ref={canvasRef} aria-hidden="true" className={mode === 'plain' ? 'hidden' : 'block mx-auto'} />
          {mode === 'plain' && (
            <p aria-hidden={preview ? undefined : true} className="font-mono font-bold break-words" style={{ color: litColor }}>
              {text}
            </p>
          )}
        </div>
      </div>

      {mode === 'scroll' && (
        <button
          type="button"
          aria-pressed={paused}
          aria-label={t('ledSignPauseBtn')}
          title={t('ledSignPauseBtn')}
          onClick={() => setPaused(current => !current)}
          className="shrink-0 w-9 flex items-center justify-center border-l-2 border-[#262626] text-[#b3b3b3] hover:bg-[#262626] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
        >
          {paused ? <Play aria-hidden="true" size={16} /> : <Pause aria-hidden="true" size={16} />}
        </button>
      )}
    </section>
  );
}
