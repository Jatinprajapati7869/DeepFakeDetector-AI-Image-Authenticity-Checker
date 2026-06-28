const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): ValidationResult {
  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type "${file.type}". Please upload a JPEG, PNG, or WebP image.`,
    };
  }

  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File is ${sizeMB} MB. Maximum allowed size is 10 MB.`,
    };
  }

  return { valid: true };
}

export function validateImageFiles(files: File[]): ValidationResult {
  if (files.length === 0) {
    return { valid: false, error: 'No files selected.' };
  }

  if (files.length > 10) {
    return { valid: false, error: 'Batch mode supports up to 10 images at a time.' };
  }

  for (const file of files) {
    const result = validateImageFile(file);
    if (!result.valid) return result;
  }

  return { valid: true };
}
