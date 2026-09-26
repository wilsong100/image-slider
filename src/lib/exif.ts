/**
 * Reads the date a photo was taken from its EXIF data (JPEG only), without any
 * library. Returns an ISO date "YYYY-MM-DD", or undefined if there isn't one.
 */
export async function readPhotoDate(file: Blob): Promise<string | undefined> {
  try {
    // EXIF lives in the first APP1 segment, near the start of the file.
    const buffer = await file.slice(0, 256 * 1024).arrayBuffer();
    return parseExifDate(new DataView(buffer));
  } catch {
    return undefined;
  }
}

const TAG_EXIF_IFD = 0x8769;
const TAG_DATE_TIME = 0x0132;
const TAG_DATE_ORIGINAL = 0x9003;
const TAG_DATE_DIGITIZED = 0x9004;

export function parseExifDate(view: DataView): string | undefined {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return undefined; // not a JPEG
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) return undefined;
    const length = view.getUint16(offset + 2);
    // APP1 segment starting with "Exif\0\0"
    if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966 && view.getUint16(offset + 8) === 0) {
      return parseTiff(view, offset + 10);
    }
    if (marker === 0xffda) return undefined; // start of image data: no EXIF
    offset += 2 + length;
  }
  return undefined;
}

function parseTiff(view: DataView, start: number): string | undefined {
  const order = view.getUint16(start);
  if (order !== 0x4949 && order !== 0x4d4d) return undefined;
  const little = order === 0x4949;
  const u16 = (o: number) => view.getUint16(start + o, little);
  const u32 = (o: number) => view.getUint32(start + o, little);

  const readIfd = (ifdOffset: number) => {
    const tags = new Map<number, number>(); // tag -> value offset (relative to TIFF start)
    const count = u16(ifdOffset);
    for (let i = 0; i < count; i++) {
      const entry = ifdOffset + 2 + i * 12;
      const tag = u16(entry);
      const type = u16(entry + 2);
      const n = u32(entry + 4);
      if (tag === TAG_EXIF_IFD) tags.set(tag, u32(entry + 8));
      // ASCII date strings are 20 bytes, so stored at an offset.
      else if (type === 2 && n >= 19) tags.set(tag, u32(entry + 8));
    }
    return tags;
  };

  const readDate = (valueOffset: number | undefined) => {
    if (valueOffset === undefined) return undefined;
    let text = '';
    for (let i = 0; i < 19; i++) text += String.fromCharCode(view.getUint8(start + valueOffset + i));
    const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(text);
    if (!m || m[1] === '0000') return undefined;
    return `${m[1]}-${m[2]}-${m[3]}`;
  };

  const ifd0 = readIfd(u32(4));
  const exifOffset = ifd0.get(TAG_EXIF_IFD);
  const exif = exifOffset ? readIfd(exifOffset) : new Map<number, number>();
  return readDate(exif.get(TAG_DATE_ORIGINAL)) ?? readDate(exif.get(TAG_DATE_DIGITIZED)) ?? readDate(ifd0.get(TAG_DATE_TIME));
}
