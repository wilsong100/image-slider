import { useEffect, useState, type FormEvent } from 'react';
import { deleteProject, getProject, listComparisons, newId, saveProject } from '../lib/db';
import { href, navigate } from '../lib/router';
import type { Project } from '../lib/types';
import { plural } from './Project';

export function ProjectForm({ id }: { id?: string }) {
  const [existing, setExisting] = useState<Project>();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getProject(id).then((p) => {
      if (!p) return navigate(href.home());
      setExisting(p);
      setName(p.name);
      setNotes(p.notes);
      listComparisons(id).then((list) => setCount(list.length));
    });
  }, [id]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const now = Date.now();
    const project: Project = {
      id: existing?.id ?? newId(),
      name: name.trim(),
      notes: notes.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await saveProject(project);
    navigate(href.project(project.id));
  };

  const onDelete = async () => {
    if (!existing) return;
    const what = count ? ` and its ${plural(count, 'comparison')}` : '';
    if (!window.confirm(`Delete “${existing.name}”${what}? This can’t be undone.`)) return;
    await deleteProject(existing.id);
    navigate(href.home());
  };

  const back = existing ? href.project(existing.id) : href.home();

  return (
    <form className="page project-form" onSubmit={onSubmit}>
      <div className="page__head">
        <div>
          <a className="back" href={back}>
            ← Back
          </a>
          <h1 className="display">{existing ? 'Edit project' : 'New project'}</h1>
        </div>
      </div>

      <div className="editor__fields editor__fields--single">
        <label className="field">
          <span className="field__label">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maple Street house" required autoFocus />
        </label>
        <label className="field">
          <span className="field__label">
            Notes <span className="field__optional">optional</span>
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Address, when you bought it, the plan for the renovation…"
          />
        </label>
      </div>

      <div className="editor__actions">
        {existing && (
          <button type="button" className="btn btn--ghost btn--danger editor__delete" onClick={onDelete}>
            Delete project
          </button>
        )}
        <a className="btn btn--ghost" href={back}>
          Cancel
        </a>
        <button className="btn btn--primary" type="submit" disabled={!name.trim() || saving}>
          {saving ? 'Saving…' : existing ? 'Save project' : 'Create project'}
        </button>
      </div>
    </form>
  );
}
