import { useEffect, useId, useState } from 'react';
import {
  BackupError,
  backupFileName,
  createBackup,
  downloadBlob,
  getLastBackupAt,
  needsBackup,
  restoreBackup,
  setLastBackupAt,
} from '../lib/backup';
import { listComparisons, listProjects, requestPersistentStorage } from '../lib/db';
import { href } from '../lib/router';

type Status = { kind: 'success' | 'error'; message: string };

const formatDate = (time: number) =>
  new Date(time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function Backup() {
  const inputId = useId();
  const [count, setCount] = useState<number>();
  const [projectCount, setProjectCount] = useState<number>();
  const [lastBackupAt, setLastBackup] = useState(getLastBackupAt);
  const [working, setWorking] = useState<'download' | 'restore'>();
  const [status, setStatus] = useState<Status>();

  const refresh = () => {
    listComparisons().then((all) => setCount(all.length));
    listProjects().then((all) => setProjectCount(all.length));
  };
  useEffect(() => {
    refresh();
  }, []);

  const onDownload = async () => {
    setWorking('download');
    setStatus(undefined);
    try {
      const { blob, count } = await createBackup();
      downloadBlob(blob, backupFileName());
      setLastBackupAt();
      setLastBackup(getLastBackupAt());
      setStatus({ kind: 'success', message: `Backup of ${plural(count, 'comparison')} downloaded.` });
    } catch (err) {
      setStatus({ kind: 'error', message: `Couldn’t create the backup: ${(err as Error).message}` });
    } finally {
      setWorking(undefined);
    }
  };

  const onRestore = async (file: File) => {
    setWorking('restore');
    setStatus(undefined);
    try {
      const { added, updated, exportedAt } = await restoreBackup(file);
      requestPersistentStorage();
      // If everything on this device is now covered by that backup, count it as backed up.
      const all = [...(await listComparisons()), ...(await listProjects())];
      if (exportedAt > (getLastBackupAt() ?? 0) && !needsBackup(all, exportedAt)) {
        setLastBackupAt(exportedAt);
        setLastBackup(exportedAt);
      }
      const parts = [added && `${plural(added, 'comparison')} added`, updated && `${updated} updated`].filter(Boolean);
      setStatus({ kind: 'success', message: parts.length ? `Restored: ${parts.join(', ')}.` : 'The backup was empty.' });
      refresh();
    } catch (err) {
      const message = err instanceof BackupError ? err.message : `Couldn’t restore: ${(err as Error).message}`;
      setStatus({ kind: 'error', message });
    } finally {
      setWorking(undefined);
    }
  };

  return (
    <div className="page backup">
      <div className="page__head">
        <div>
          <a className="back" href={href.home()}>
            ← All projects
          </a>
          <h1 className="display">Backup</h1>
        </div>
      </div>

      <p className="lede backup__intro">
        Your photos are stored only in this browser. Download a backup to keep a safe copy, or to move
        your comparisons to another phone or computer.
      </p>

      <div className="backup__cards">
        <section className="panel">
          <h2 className="panel__title">Download a backup</h2>
          <p className="panel__text">
            Saves{' '}
            {count === undefined || projectCount === undefined
              ? 'all projects and comparisons'
              : `${plural(projectCount, 'project')} and ${plural(count, 'comparison')}`}{' '}
            with their photos as a single .zip file. Keep it somewhere safe, like Google Drive, iCloud or email.
          </p>
          <p className="panel__meta">
            {lastBackupAt ? `Last backup: ${formatDate(lastBackupAt)}` : 'No backup made on this device yet.'}
          </p>
          <button className="btn btn--primary" type="button" onClick={onDownload} disabled={!!working || count === 0}>
            {working === 'download' ? 'Preparing…' : 'Download backup'}
          </button>
        </section>

        <section className="panel">
          <h2 className="panel__title">Restore from a backup</h2>
          <p className="panel__text">
            Choose a backup file to load its comparisons into this browser. Anything already here is kept;
            comparisons that are in both are replaced with the backed-up version.
          </p>
          <label htmlFor={inputId} className={`btn btn--ghost ${working ? 'is-disabled' : ''}`}>
            {working === 'restore' ? 'Restoring…' : 'Choose backup file'}
          </label>
          <input
            id={inputId}
            className="visually-hidden"
            type="file"
            accept=".zip,application/zip"
            aria-label="Backup file"
            disabled={!!working}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) onRestore(file);
            }}
          />
        </section>
      </div>

      {status && (
        <p className={status.kind === 'error' ? 'error' : 'success'} role={status.kind === 'error' ? 'alert' : 'status'}>
          {status.message}{' '}
          {status.kind === 'success' && working === undefined && count ? (
            <a href={href.home()}>View projects</a>
          ) : null}
        </p>
      )}
    </div>
  );
}
