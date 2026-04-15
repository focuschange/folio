// Common text encodings supported in the editor

export interface EncodingOption {
  value: string;
  label: string;
  group: 'unicode' | 'western' | 'asian' | 'other';
}

export const COMMON_ENCODINGS: EncodingOption[] = [
  // Unicode
  { value: 'UTF-8', label: 'UTF-8', group: 'unicode' },
  { value: 'UTF-16LE', label: 'UTF-16 LE', group: 'unicode' },
  { value: 'UTF-16BE', label: 'UTF-16 BE', group: 'unicode' },
  // Western
  { value: 'ISO-8859-1', label: 'Western (ISO-8859-1)', group: 'western' },
  { value: 'Windows-1252', label: 'Western (Windows-1252)', group: 'western' },
  // Asian
  { value: 'EUC-KR', label: 'Korean (EUC-KR)', group: 'asian' },
  { value: 'Windows-949', label: 'Korean (Windows-949)', group: 'asian' },
  { value: 'Shift_JIS', label: 'Japanese (Shift JIS)', group: 'asian' },
  { value: 'EUC-JP', label: 'Japanese (EUC-JP)', group: 'asian' },
  { value: 'GB2312', label: 'Chinese Simplified (GB2312)', group: 'asian' },
  { value: 'GBK', label: 'Chinese Simplified (GBK)', group: 'asian' },
  { value: 'Big5', label: 'Chinese Traditional (Big5)', group: 'asian' },
  // Other
  { value: 'ASCII', label: 'ASCII', group: 'other' },
];

export function getCommonEncodings(): EncodingOption[] {
  return COMMON_ENCODINGS;
}

export function isValidEncoding(encoding: string): boolean {
  return COMMON_ENCODINGS.some(e => e.value === encoding);
}
