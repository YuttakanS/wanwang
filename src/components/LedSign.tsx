'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  /** Inside the editor: no pause button, and nothing for screen readers, which read the form instead. */
  preview?: boolean;
}

/** Canvas pixels sampled per LED side when the text is turned into LEDs. */
const SAMPLES = 4;
/** An LED lights when the letter covers this much of it. */
const LIT_COVERAGE = 0.4;
/** Tall Thai marks and deep tails, so every message gets the same letter size. */
const TALLEST_TEXT = 'ปี่ป๊ฏูฎูÁy';

/**
 * 'scroll' moves the text. People who asked for reduced motion get 'still' when the whole text
 * fits on the sign, and otherwise 'plain': ordinary text, so nothing is cut off.
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
  const litAlpha = LIT_COVERAGE * 255 * SAMPLES * SAMPLES;
  for (let row = 0; row < LED_ROWS; row++) {
    for (let col = 0; col < cols; col++) {
      let alpha = 0;
      for (let y = 0; y < SAMPLES; y++) {
        const line = ((row * SAMPLES + y) * source.width + col * SAMPLES) * 4;
        for (let x = 0; x < SAMPLES; x++) alpha += pixels[line + x * 4 + 3];
      }
      if (alpha >= litAlpha) image.data[(row * cols + col) * 4 + 3] = 255;
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
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const litColor = ledColor(color);

  // Before the first paint, so the canvas never shows at its default size and then jumps.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!frame || !canvas || !ctx) {
      setMode('plain');
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let bitmap: HTMLCanvasElement | null = null;
    let pitch = 0;
    let viewCols = 0;
    let lit: CanvasPattern | null = null;
    let off: CanvasPattern | null = null;
    let still = false;
    let position = 0;
    let drawnColumn = -1;
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
      lit = ledPattern(ctx, pitch, litColor);
      off = ledPattern(ctx, pitch, LED_OFF_COLOR);

      const fits = !bitmap || bitmap.width <= viewCols;
      still = reducedMotion.matches;
      setMode(!still ? 'scroll' : fits ? 'still' : 'plain');
      drawnColumn = -1;
      draw();
    };

    const tick = (time: number) => {
      frameRequest = requestAnimationFrame(tick);
      // A long gap means the tab was in the background; the text carries on from where it was.
      const elapsed = Math.min(time - lastTime, 100);
      lastTime = time;
      if (still || !bitmap || !onScreen || pausedRef.current) return;
      position = (position + (elapsed / 1000) * LED_SPEED) % stripColumns(bitmap.width, viewCols);
      const column = Math.floor(position);
      if (column !== drawnColumn) {
        drawnColumn = column;
        draw();
      }
    };

    const fontFamily = getComputedStyle(frame).fontFamily;
    const fontSpec = `700 32px ${fontFamily}`;
    const lightUp = () => {
      bitmap = rasterizeText(text, fontFamily);
      if (bitmap) layOut();
      else setMode('plain');
    };

    // The site's font may still be on its way. Until it is here the sign stays unlit.
    if (!document.fonts?.check || document.fonts.check(fontSpec, text)) {
      lightUp();
    } else {
      layOut();
      document.fonts
        .load(fontSpec, text)
        .catch(() => undefined)
        .then(() => {
          if (!disposed) lightUp();
        });
    }
    lastTime = performance.now();
    frameRequest = requestAnimationFrame(tick);

    const resizeObserver = new ResizeObserver(layOut);
    resizeObserver.observe(frame);
    // Nothing is drawn while the sign is scrolled out of view.
    const visibilityObserver = new IntersectionObserver(entries => {
      onScreen = entries[entries.length - 1].isIntersecting;
    });
    visibilityObserver.observe(frame);
    reducedMotion.addEventListener('change', layOut);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameRequest);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      reducedMotion.removeEventListener('change', layOut);
    };
  }, [text, litColor]);

  return (
    <section
      aria-label={preview ? undefined : t('ledSignLabel')}
      aria-hidden={preview || undefined}
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

      {!preview && mode === 'scroll' && (
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
