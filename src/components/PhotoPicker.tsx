import { useId, useRef, useState, type DragEvent } from 'react';

type Props = {
  label: 'Before' | 'After';
  previewUrl?: string;
  busy?: boolean;
  onFile: (file: File) => void;
};

export function PhotoPicker({ label, previewUrl, busy, onFile }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      className={`picker ${over ? 'is-over' : ''} ${previewUrl ? 'has-image' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <span className={`picker__tag picker__tag--${label.toLowerCase()}`}>{label}</span>
      {previewUrl ? (
        <img className="picker__preview" src={previewUrl} alt={`${label} photo preview`} />
      ) : (
        <div className="picker__empty">
          <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
            <path
              d="M4 7h3l2-2.5h6L17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span>Drop a photo here</span>
        </div>
      )}
      {busy && <div className="picker__busy">Preparing photo…</div>}
      <label htmlFor={inputId} className="btn btn--ghost picker__choose">
        {previewUrl ? 'Replace photo' : `Choose ${label.toLowerCase()} photo`}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        className="visually-hidden"
        type="file"
        accept="image/*"
        aria-label={`${label} photo`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
    </div>
  );
}
