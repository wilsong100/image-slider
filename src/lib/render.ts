import { coverZoom } from './alignment';
import type { Alignment } from './types';

/** Draws a comparison onto a canvas — used for GIF/video export. */

export type FrameSources = {
  before: ImageBitmap;
  after: ImageBitmap;
  alignment?: Alignment;
};

export type Overlay = {
  beforeLabel: string;
  afterLabel: string;
  title?: string;
  subtitle?: string;
};

export type Shape = 'photo' | 'square' | 'portrait';

/** Output size for a shape, with `longEdge` pixels on the longer side (even numbers, for video encoders). */
export function frameSize(shape: Shape, photoAspect: number, longEdge: number) {
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  const aspect = shape === 'square' ? 1 : shape === 'portrait' ? 4 / 5 : photoAspect;
  return aspect >= 1
    ? { width: even(longEdge), height: even(longEdge / aspect) }
    : { width: even(longEdge * aspect), height: even(longEdge) };
}

/** Draws `image` centred on the origin, covering a w×h box (like object-fit: cover). */
function drawCover(ctx: CanvasRenderingContext2D, image: ImageBitmap, w: number, h: number) {
  const boxAspect = w / h;
  const imgAspect = image.width / image.height;
  let sw = image.width;
  let sh = image.height;
  if (imgAspect > boxAspect) sw = sh * boxAspect;
  else sh = sw / boxAspect;
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, -w / 2, -h / 2, w, h);
}

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: 'left' | 'right', fill: string, size: number) {
  ctx.font = `700 ${size}px "Inter Variable", system-ui, sans-serif`;
  const label = text.toUpperCase();
  const padX = size * 0.9;
  const w = ctx.measureText(label).width + padX * 2 + label.length * size * 0.1;
  const h = size * 2.1;
  const left = align === 'left' ? x : x - w;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(left, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  // Letter-spacing isn't universally supported on canvas, so space manually.
  let cx = left + padX;
  for (const ch of label) {
    ctx.fillText(ch, cx, y + h / 2 + size * 0.05);
    cx += ctx.measureText(ch).width + size * 0.1;
  }
}

const fade = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Renders one frame. `pos` is the slider position: 100 shows only the before
 * photo, 0 only the after photo.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  src: FrameSources,
  pos: number,
  overlay: Overlay,
) {
  const aspect = src.before.width / src.before.height;
  // The before photo's box, covering the whole frame.
  const boxW = width / height > aspect ? width : height * aspect;
  const boxH = boxW / aspect;
  const zoom = coverZoom(src.alignment, aspect);
  const a = src.alignment;

  ctx.save();
  ctx.fillStyle = '#1b1815';
  ctx.fillRect(0, 0, width, height);

  // After photo, with its alignment.
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoom, zoom);
  if (a) {
    ctx.translate((a.x / 100) * boxW, (a.y / 100) * boxH);
    ctx.rotate((a.rotate * Math.PI) / 180);
    ctx.scale(a.scale, a.scale);
  }
  drawCover(ctx, src.after, boxW, boxH);
  ctx.restore();

  // Before photo, clipped to the left of the divider.
  const x = (width * pos) / 100;
  if (x > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, x, height);
    ctx.clip();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    drawCover(ctx, src.before, boxW, boxH);
    ctx.restore();
  }

  const unit = Math.min(width, height);
  if (x > 0 && x < width) {
    ctx.save();
    ctx.shadowColor = 'rgb(0 0 0 / 0.4)';
    ctx.shadowBlur = unit * 0.02;
    ctx.fillStyle = '#fff';
    const line = Math.max(2, unit * 0.005);
    ctx.fillRect(x - line / 2, 0, line, height);
    ctx.restore();
  }

  // Labels fade out as the divider reaches them.
  const size = Math.round(unit * 0.026);
  const margin = unit * 0.035;
  ctx.globalAlpha = fade((pos - 8) / 12);
  if (ctx.globalAlpha > 0) pill(ctx, overlay.beforeLabel, margin, margin, 'left', 'rgb(30 26 23 / 0.7)', size);
  ctx.globalAlpha = fade((92 - pos) / 12);
  if (ctx.globalAlpha > 0) pill(ctx, overlay.afterLabel, width - margin, margin, 'right', 'rgb(194 96 58 / 0.92)', size);
  ctx.globalAlpha = 1;

  // Caption along the bottom.
  if (overlay.title) {
    const titleSize = Math.round(unit * 0.058);
    const subSize = Math.round(unit * 0.03);
    const band = titleSize * 1.4 + (overlay.subtitle ? subSize * 1.8 : 0) + margin * 1.6;
    const gradient = ctx.createLinearGradient(0, height - band * 1.6, 0, height);
    gradient.addColorStop(0, 'rgb(0 0 0 / 0)');
    gradient.addColorStop(1, 'rgb(0 0 0 / 0.72)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - band * 1.6, width, band * 1.6);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    let y = height - margin;
    if (overlay.subtitle) {
      ctx.font = `500 ${subSize}px "Inter Variable", system-ui, sans-serif`;
      ctx.fillStyle = 'rgb(255 255 255 / 0.85)';
      ctx.fillText(overlay.subtitle, margin, y, width - margin * 2);
      y -= subSize * 1.7;
    }
    ctx.font = `600 ${titleSize}px "Fraunces Variable", Georgia, serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText(overlay.title, margin, y, width - margin * 2);
  }
  ctx.restore();
}
