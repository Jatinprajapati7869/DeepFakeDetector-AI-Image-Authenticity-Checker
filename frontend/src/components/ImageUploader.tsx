import { useCallback, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { validateImageFile } from '@/utils/imageValidation';

interface ImageUploaderProps {
  onFileSelected: (file: File) => void;
  isDisabled?: boolean;
}

export function ImageUploader({ onFileSelected, isDisabled = false }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setValidationError(validation.error ?? 'Invalid file.');
        return;
      }
      setValidationError(null);
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (isDisabled) return;
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [isDisabled, processFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = '';
    },
    [processFile],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [],
  );

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label="Image upload area. Press Enter or Space to browse files, or drag and drop an image here."
        aria-disabled={isDisabled}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); if (!isDisabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onKeyDown={handleKeyDown}
        onClick={() => !isDisabled && inputRef.current?.click()}
        className={clsx(
          'relative flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 text-center transition-all duration-200',
          isDragging && !isDisabled
            ? 'border-accent bg-accent-subtle/30 scale-[1.01]'
            : 'border-slate-600 bg-surface-raised hover:border-accent/60 hover:bg-surface-overlay/50',
          isDisabled && 'cursor-not-allowed opacity-50',
          !isDisabled && 'cursor-pointer',
        )}
      >
        <UploadIcon className="h-12 w-12 text-slate-500" />

        <div>
          <p className="font-display text-base font-semibold text-slate-200">
            {isDragging ? 'Drop it here' : 'Drop an image or click to browse'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            JPEG, PNG, WebP · Max 10 MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          onChange={handleFileInput}
          disabled={isDisabled}
        />
      </div>

      {validationError && (
        <p role="alert" className="mt-2 text-sm text-fake">
          {validationError}
        </p>
      )}
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}
