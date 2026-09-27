import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { drawFrame, type FrameSources, type Overlay } from './render';
import { LOOP_PHASES, positionAt, totalMs } from './timeline';

type Size = { width: number; height: number };
type Progress = (fraction: number) => void;

const LOOP_MS = totalMs(LOOP_PHASES);

function makeCanvas({ width, height }: Size) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  return { canvas, ctx };
}

/** Lets the page repaint (progress bar) during long work. */
const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Encodes one seamless loop of the sweep as an animated GIF. */
export async function createGif(src: FrameSources, overlay: Overlay, size: Size, onProgress?: Progress): Promise<Blob> {
  const { ctx } = makeCanvas(size);
  const { width, height } = size;
  const frameMs = 1000 / 15;
  const pixels = () => ctx.getImageData(0, 0, width, height).data;

  // One shared palette, built from the all-before and all-after frames, keeps
  // colours steady between frames (no flicker) and the file smaller.
  drawFrame(ctx, width, height, src, 100, overlay);
  const first = pixels();
  drawFrame(ctx, width, height, src, 0, overlay);
  const last = pixels();
  const sample = new Uint8ClampedArray(first.length + last.length);
  sample.set(first);
  sample.set(last, first.length);
  const palette = quantize(sample, 256);

  const gif = GIFEncoder();
  let pending: { index: Uint8Array; delay: number; pos: number } | undefined;
  let wroteFirst = false;
  const flush = () => {
    if (!pending) return;
    gif.writeFrame(pending.index, width, height, { palette: wroteFirst ? undefined : palette, delay: pending.delay });
    wroteFirst = true;
  };

  const count = Math.round(LOOP_MS / frameMs);
  for (let i = 0; i < count; i++) {
    const pos = positionAt(LOOP_PHASES, i * frameMs);
    // While the slider holds still, lengthen the previous frame instead of repeating it.
    if (pending && Math.abs(pending.pos - pos) < 0.05) {
      pending.delay += frameMs;
    } else {
      flush();
      drawFrame(ctx, width, height, src, pos, overlay);
      pending = { index: applyPalette(pixels(), palette), delay: frameMs, pos };
    }
    if (i % 4 === 0) {
      onProgress?.(i / count);
      await breathe();
    }
  }
  flush();
  gif.finish();
  onProgress?.(1);
  return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' });
}

/** The best video format this browser can record — MP4 where possible, as it's what phones and apps expect. */
export function videoFormat(): { mimeType: string; extension: 'mp4' | 'webm' } | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) return undefined;
  return { mimeType, extension: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm' };
}

/**
 * Records the sweep as a video by playing it on a canvas in real time
 * (so it takes as long as the clip: about 7 seconds per loop).
 */
export async function recordVideo(
  src: FrameSources,
  overlay: Overlay,
  size: Size,
  loops = 2,
  onProgress?: Progress,
): Promise<{ blob: Blob; extension: string }> {
  const format = videoFormat();
  if (!format) throw new Error('This browser can’t record video. Try the GIF option instead.');
  const { canvas, ctx } = makeCanvas(size);
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

  const duration = LOOP_MS * loops;
  drawFrame(ctx, size.width, size.height, src, 100, overlay);
  recorder.start(250);
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = performance.now() - start;
      drawFrame(ctx, size.width, size.height, src, positionAt(LOOP_PHASES, t % LOOP_MS), overlay);
      onProgress?.(Math.min(1, t / duration));
      if (t >= duration) return resolve();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  onProgress?.(1);
  return { blob: new Blob(chunks, { type: format.mimeType.split(';')[0] }), extension: format.extension };
}
