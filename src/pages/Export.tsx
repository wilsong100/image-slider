import { useEffect, useRef, useState } from 'react';
import { downloadBlob } from '../lib/backup';
import { formatMonthYear, timeBetween } from '../lib/dates';
import { getComparison, getImage } from '../lib/db';
import { createGif, recordVideo, videoFormat } from '../lib/exporter';
import { drawFrame, frameSize, type FrameSources, type Overlay, type Shape } from '../lib/render';
import { href, navigate } from '../lib/router';
import { LOOP_PHASES, positionAt, totalMs } from '../lib/timeline';
import type { Comparison } from '../lib/types';

type Format = 'video' | 'gif';
type Result = { file: File; url: string };

const SHAPES: { value: Shape; label: string; hint: string }[] = [
  { value: 'photo', label: 'Photo shape', hint: 'Same shape as your photos' },
  { value: 'square', label: 'Square', hint: 'Instagram and Facebook posts' },
  { value: 'portrait', label: 'Portrait 4:5', hint: 'Fills more of a phone screen' },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'comparison';
const sizeText = (bytes: number) => (bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`);

async function loadSources(c: Comparison): Promise<FrameSources> {
  const [before, after] = await Promise.all([getImage(c.beforeImageId), getImage(c.afterImageId)]);
  if (!before || !after) throw new Error('Photos not found.');
  // Make sure the caption fonts are ready before drawing text on the canvas.
  await Promise.all([
    document.fonts.load('600 40px "Fraunces Variable"'),
    document.fonts.load('700 20px "Inter Variable"'),
  ]).catch(() => {});
  return {
    before: await createImageBitmap(before.blob),
    after: await createImageBitmap(after.blob),
    alignment: c.alignment,
  };
}

export function Export({ id }: { id: string }) {
  const [comparison, setComparison] = useState<Comparison>();
  const [sources, setSources] = useState<FrameSources>();
  const [format, setFormat] = useState<Format>(videoFormat() ? 'video' : 'gif');
  const [shape, setShape] = useState<Shape>('photo');
  const [caption, setCaption] = useState(true);
  const [progress, setProgress] = useState<number>();
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState<string>();
  const previewRef = useRef<HTMLCanvasElement>(null);
  const canVideo = Boolean(videoFormat());

  useEffect(() => {
    getComparison(id).then(async (c) => {
      if (!c) return navigate(href.home());
      setComparison(c);
      try {
        setSources(await loadSources(c));
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }, [id]);

  const overlay: Overlay | undefined = comparison && {
    beforeLabel: ['Before', formatMonthYear(comparison.beforeDate)].filter(Boolean).join(' · '),
    afterLabel: ['After', formatMonthYear(comparison.afterDate)].filter(Boolean).join(' · '),
    title: caption ? comparison.title : undefined,
    subtitle: caption
      ? [
          [formatMonthYear(comparison.beforeDate), formatMonthYear(comparison.afterDate)].filter(Boolean).join(' → '),
          timeBetween(comparison.beforeDate, comparison.afterDate),
        ]
          .filter(Boolean)
          .join(' · ') || undefined
      : undefined,
  };

  const aspect = sources ? sources.before.width / sources.before.height : 4 / 3;
  const preview = frameSize(shape, aspect, 720);

  // Live, looping preview of exactly what will be exported.
  useEffect(() => {
    const canvas = previewRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !sources || !overlay) return;
    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      drawFrame(ctx, canvas.width, canvas.height, sources, positionAt(LOOP_PHASES, (now - start) % totalMs(LOOP_PHASES)), overlay);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // `overlay` and `preview` are derived from these.
  }, [sources, shape, caption, comparison]);

  // Settings changed: the old file no longer matches.
  useEffect(() => {
    setResult((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return undefined;
    });
  }, [format, shape, caption]);

  const onCreate = async () => {
    if (!sources || !overlay || !comparison) return;
    setError(undefined);
    setResult(undefined);
    setProgress(0);
    try {
      let blob: Blob;
      let extension: string;
      if (format === 'gif') {
        blob = await createGif(sources, overlay, frameSize(shape, aspect, 540), setProgress);
        extension = 'gif';
      } else {
        ({ blob, extension } = await recordVideo(sources, overlay, frameSize(shape, aspect, 1080), 2, setProgress));
      }
      const file = new File([blob], `${slug(comparison.title)}-before-after.${extension}`, { type: blob.type });
      setResult({ file, url: URL.createObjectURL(file) });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgress(undefined);
    }
  };

  const canShare = result && typeof navigator.canShare === 'function' && navigator.canShare({ files: [result.file] });
  const onShare = async () => {
    if (!result || !comparison) return;
    try {
      await navigator.share({ files: [result.file], title: comparison.title });
    } catch {
      // Cancelled by the user — nothing to do.
    }
  };

  if (!comparison) return <div className="page" aria-busy="true" />;
  const busy = progress !== undefined;

  return (
    <div className="page export">
      <div className="page__head">
        <div>
          <a className="back" href={href.view(comparison.id)}>
            ← Back
          </a>
          <p className="eyebrow">{comparison.title}</p>
          <h1 className="display">Export</h1>
        </div>
      </div>

      <div className="export__layout">
        <div className="export__preview">
          <canvas
            ref={previewRef}
            width={preview.width}
            height={preview.height}
            style={{ aspectRatio: `${preview.width} / ${preview.height}` }}
            aria-label="Preview of the exported animation"
          />
        </div>

        <div className="export__controls">
          <fieldset className="choice">
            <legend className="field__label">Format</legend>
            <label className={`choice__option ${format === 'video' ? 'is-selected' : ''} ${canVideo ? '' : 'is-disabled'}`}>
              <input type="radio" name="format" checked={format === 'video'} disabled={!canVideo || busy} onChange={() => setFormat('video')} />
              <span>
                <strong>Video</strong>
                <small>{canVideo ? `Best quality · ${videoFormat()!.extension.toUpperCase()}` : 'Not supported in this browser'}</small>
              </span>
            </label>
            <label className={`choice__option ${format === 'gif' ? 'is-selected' : ''}`}>
              <input type="radio" name="format" checked={format === 'gif'} disabled={busy} onChange={() => setFormat('gif')} />
              <span>
                <strong>GIF</strong>
                <small>Plays anywhere, smaller and lower quality</small>
              </span>
            </label>
          </fieldset>

          <fieldset className="choice">
            <legend className="field__label">Shape</legend>
            {SHAPES.map((s) => (
              <label key={s.value} className={`choice__option ${shape === s.value ? 'is-selected' : ''}`}>
                <input type="radio" name="shape" checked={shape === s.value} disabled={busy} onChange={() => setShape(s.value)} />
                <span>
                  <strong>{s.label}</strong>
                  <small>{s.hint}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="check">
            <input type="checkbox" checked={caption} disabled={busy} onChange={(e) => setCaption(e.target.checked)} /> Show
            title and dates
          </label>

          {busy ? (
            <div className="export__progress" role="status">
              <span>{format === 'video' ? 'Recording video… keep this page open' : 'Creating GIF…'}</span>
              <div className="meter">
                <div style={{ width: `${Math.round(progress! * 100)}%` }} />
              </div>
            </div>
          ) : result ? (
            <div className="export__result" role="status">
              <p>
                <strong>{result.file.name}</strong> · {sizeText(result.file.size)}
              </p>
              <div className="export__actions">
                {canShare && (
                  <button type="button" className="btn btn--primary" onClick={onShare}>
                    Share…
                  </button>
                )}
                <button
                  type="button"
                  className={`btn ${canShare ? 'btn--ghost' : 'btn--primary'}`}
                  onClick={() => downloadBlob(result.file, result.file.name)}
                >
                  Download
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn--primary export__create" onClick={onCreate} disabled={!sources}>
              {format === 'video' ? 'Create video' : 'Create GIF'}
            </button>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
