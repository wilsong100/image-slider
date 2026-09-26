import { useEffect, useState, type FormEvent } from 'react';
import { PhotoPicker } from '../components/PhotoPicker';
import {
  getComparison,
  listComparisons,
  listProjects,
  newId,
  requestPersistentStorage,
  saveComparison,
} from '../lib/db';
import { useBlobUrl, useImageUrl } from '../lib/hooks';
import { processImage } from '../lib/image';
import { href, navigate } from '../lib/router';
import type { Comparison, Project, StoredImage } from '../lib/types';

type Slot = 'before' | 'after';

/** Create a comparison in `projectId`, or edit comparison `id`. */
export function Editor({ id, projectId: initialProjectId }: { id?: string; projectId?: string }) {
  const [existing, setExisting] = useState<Comparison>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? '');
  const [allComparisons, setAllComparisons] = useState<Comparison[]>([]);
  const [title, setTitle] = useState('');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<Partial<Record<Slot, StoredImage>>>({});
  const [busy, setBusy] = useState<Partial<Record<Slot, boolean>>>({});
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listComparisons().then(setAllComparisons);
    listProjects().then((list) => {
      setProjects(list);
      if (!id && !list.some((p) => p.id === initialProjectId)) navigate(href.home());
    });
    if (!id) return;
    getComparison(id).then((c) => {
      if (!c) return navigate(href.home());
      setExisting(c);
      setProjectId(c.projectId);
      setTitle(c.title);
      setRoom(c.room);
      setNotes(c.notes);
    });
  }, [id, initialProjectId]);

  // Suggest rooms already used in this project.
  const rooms = [
    ...new Set(allComparisons.filter((c) => c.projectId === projectId).map((c) => c.room.trim()).filter(Boolean)),
  ].sort();

  const storedBefore = useImageUrl(images.before ? undefined : existing?.beforeImageId, 'thumb');
  const storedAfter = useImageUrl(images.after ? undefined : existing?.afterImageId, 'thumb');
  const newBefore = useBlobUrl(images.before?.thumb);
  const newAfter = useBlobUrl(images.after?.thumb);

  const pick = async (slot: Slot, file: File) => {
    setError(undefined);
    setBusy((b) => ({ ...b, [slot]: true }));
    try {
      const image = await processImage(file);
      setImages((prev) => ({ ...prev, [slot]: image }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy((b) => ({ ...b, [slot]: false }));
    }
  };

  const beforeId = images.before?.id ?? existing?.beforeImageId;
  const afterId = images.after?.id ?? existing?.afterImageId;
  const canSave =
    Boolean(beforeId && afterId && title.trim() && projectId) && !saving && !busy.before && !busy.after;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave || !beforeId || !afterId) return;
    setSaving(true);
    const now = Date.now();
    const comparison: Comparison = {
      id: existing?.id ?? newId(),
      projectId,
      title: title.trim(),
      room: room.trim(),
      notes: notes.trim(),
      beforeImageId: beforeId,
      afterImageId: afterId,
      // A new photo won't match the old alignment, so start again.
      alignment: images.before || images.after ? undefined : existing?.alignment,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      await saveComparison(comparison, Object.values(images));
      requestPersistentStorage();
      navigate(href.view(comparison.id));
    } catch (err) {
      setError(`Couldn’t save: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  const back = existing ? href.view(existing.id) : href.project(projectId);

  return (
    <form className="page editor" onSubmit={onSubmit}>
      <div className="page__head">
        <div>
          <a className="back" href={back}>
            ← Back
          </a>
          <h1 className="display">{existing ? 'Edit comparison' : 'New comparison'}</h1>
        </div>
      </div>

      <div className="editor__photos">
        <PhotoPicker label="Before" previewUrl={newBefore ?? storedBefore} busy={busy.before} onFile={(f) => pick('before', f)} />
        <PhotoPicker label="After" previewUrl={newAfter ?? storedAfter} busy={busy.after} onFile={(f) => pick('after', f)} />
      </div>
      <p className="hint">
        Tip: for the best effect, take the after photo from the same spot and angle as the before
        photo.
      </p>

      <div className="editor__fields">
        <label className="field">
          <span className="field__label">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kitchen – towards the garden" required />
        </label>
        <label className="field">
          <span className="field__label">Room</span>
          <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Kitchen" list="room-options" />
          <datalist id="room-options">
            {rooms.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>
        {projects.length > 1 && (
          <label className="field">
            <span className="field__label">Project</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field field--wide">
          <span className="field__label">
            Notes <span className="field__optional">optional</span>
          </span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What was done, who did it, how long it took…" />
        </label>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="editor__actions">
        <a className="btn btn--ghost" href={back}>
          Cancel
        </a>
        <button className="btn btn--primary" type="submit" disabled={!canSave}>
          {saving ? 'Saving…' : 'Save comparison'}
        </button>
      </div>
    </form>
  );
}
