import { describe, it, expect } from 'vitest';
import { validateImageFile, validateImageFiles } from '@/utils/imageValidation';

function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe('validateImageFile', () => {
  it('accepts a valid JPEG under the size limit', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024);
    expect(validateImageFile(file).valid).toBe(true);
  });

  it('accepts a valid PNG', () => {
    const file = makeFile('image.png', 'image/png', 500);
    expect(validateImageFile(file).valid).toBe(true);
  });

  it('accepts a valid WebP', () => {
    const file = makeFile('image.webp', 'image/webp', 800);
    expect(validateImageFile(file).valid).toBe(true);
  });

  it('rejects a GIF', () => {
    const file = makeFile('animation.gif', 'image/gif', 100);
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/unsupported/i);
  });

  it('rejects a file over 10 MB', () => {
    const file = makeFile('huge.jpg', 'image/jpeg', 11 * 1024 * 1024);
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/maximum/i);
  });

  it('accepts a file exactly at the 10 MB boundary', () => {
    const file = makeFile('exact.jpg', 'image/jpeg', 10 * 1024 * 1024);
    expect(validateImageFile(file).valid).toBe(true);
  });
});

describe('validateImageFiles', () => {
  it('returns invalid for an empty array', () => {
    const result = validateImageFiles([]);
    expect(result.valid).toBe(false);
  });

  it('accepts up to 10 valid files', () => {
    const files = Array.from({ length: 10 }, (_, i) => makeFile(`img${i}.jpg`, 'image/jpeg', 100));
    expect(validateImageFiles(files).valid).toBe(true);
  });

  it('rejects more than 10 files', () => {
    const files = Array.from({ length: 11 }, (_, i) => makeFile(`img${i}.jpg`, 'image/jpeg', 100));
    const result = validateImageFiles(files);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/10/);
  });

  it('rejects a batch containing an invalid type', () => {
    const files = [makeFile('good.jpg', 'image/jpeg', 100), makeFile('bad.bmp', 'image/bmp', 100)];
    expect(validateImageFiles(files).valid).toBe(false);
  });
});
