import { timeBetween } from './dates';
import { parseExifDate, readPhotoDate } from './exif';

/** Builds a minimal JPEG with an EXIF block (big- or little-endian). */
function jpegWithExif(opts: { little?: boolean; original?: string; ifd0Date?: string }) {
  const little = opts.little ?? false;
  const tiff: number[] = [];
  const u16 = (v: number) => (little ? [v & 255, v >> 8] : [v >> 8, v & 255]);
  const u32 = (v: number) =>
    little ? [v & 255, (v >> 8) & 255, (v >> 16) & 255, v >>> 24] : [v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255];
  const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0)).concat(0);

  // Layout: header(8) | IFD0 at 8 | Exif IFD | strings
  const ifd0Entries: number[][] = [];
  const exifEntries: number[][] = [];
  const strings: { tagList: number[][]; tag: number; text: string }[] = [];
  if (opts.ifd0Date) strings.push({ tagList: ifd0Entries, tag: 0x0132, text: opts.ifd0Date });
  if (opts.original) strings.push({ tagList: exifEntries, tag: 0x9003, text: opts.original });

  const ifd0Count = (opts.ifd0Date ? 1 : 0) + 1; // + Exif pointer
  const ifd0Size = 2 + ifd0Count * 12 + 4;
  const exifOffset = 8 + ifd0Size;
  const exifSize = 2 + (opts.original ? 1 : 0) * 12 + 4;
  let stringOffset = exifOffset + exifSize;
  const stringBytes: number[] = [];
  for (const s of strings) {
    s.tagList.push([...u16(s.tag), ...u16(2), ...u32(20), ...u32(stringOffset)]);
    stringBytes.push(...ascii(s.text));
    stringOffset += 20;
  }
  ifd0Entries.push([...u16(0x8769), ...u16(4), ...u32(1), ...u32(exifOffset)]);

  tiff.push(...(little ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8));
  tiff.push(...u16(ifd0Entries.length), ...ifd0Entries.flat(), ...u32(0));
  tiff.push(...u16(exifEntries.length), ...exifEntries.flat(), ...u32(0));
  tiff.push(...stringBytes);

  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xe1, len >> 8, len & 255, ...app1, 0xff, 0xda, 0, 2]);
}

const view = (bytes: Uint8Array) => new DataView(bytes.buffer);

describe('reading photo dates', () => {
  it('reads DateTimeOriginal from big- and little-endian EXIF', () => {
    expect(parseExifDate(view(jpegWithExif({ original: '2025:03:12 14:05:09' })))).toBe('2025-03-12');
    expect(parseExifDate(view(jpegWithExif({ little: true, original: '2026:09:03 08:00:00' })))).toBe('2026-09-03');
  });

  it('prefers the original date, falling back to the file date', () => {
    expect(parseExifDate(view(jpegWithExif({ original: '2025:03:12 00:00:00', ifd0Date: '2026:01:01 00:00:00' })))).toBe('2025-03-12');
    expect(parseExifDate(view(jpegWithExif({ ifd0Date: '2024:11:30 10:00:00' })))).toBe('2024-11-30');
  });

  it('returns nothing for photos without a date, blank dates, or non-JPEGs', async () => {
    expect(parseExifDate(view(jpegWithExif({})))).toBeUndefined();
    expect(parseExifDate(view(jpegWithExif({ original: '0000:00:00 00:00:00' })))).toBeUndefined();
    expect(await readPhotoDate(new Blob(['not a photo']))).toBeUndefined();
    expect(await readPhotoDate(new Blob([jpegWithExif({ original: '2025:03:12 14:05:09' }) as BlobPart]))).toBe('2025-03-12');
  });
});

describe('timeBetween', () => {
  it('describes the gap between two dates', () => {
    expect(timeBetween('2025-03-12', '2026-09-12')).toBe('1 year 6 months later');
    expect(timeBetween('2025-03-12', '2026-09-11')).toBe('1 year 5 months later');
    expect(timeBetween('2025-03-12', '2027-03-12')).toBe('2 years later');
    expect(timeBetween('2025-03-12', '2025-06-20')).toBe('3 months later');
    expect(timeBetween('2025-03-01', '2025-03-22')).toBe('3 weeks later');
    expect(timeBetween('2025-03-01', '2025-03-02')).toBe('1 day later');
  });
  it('is empty when a date is missing or the order is backwards', () => {
    expect(timeBetween(undefined, '2025-03-01')).toBe('');
    expect(timeBetween('2025-03-01', '2024-03-01')).toBe('');
    expect(timeBetween('2025-03-01', '2025-03-01')).toBe('');
  });
});
