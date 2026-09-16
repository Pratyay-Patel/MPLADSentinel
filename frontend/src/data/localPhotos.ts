/**
 * Citizen-uploaded site photos for grievances and work recommendations —
 * held only in this browser tab's memory, never sent to any backend.
 *
 * The real IPFS/Pinata *write* path doesn't exist yet — `PinataClient` on the
 * backend is currently read-only by design (it only lists the field-officer's
 * most recent uploads; see its Javadoc). Until that's built, a citizen's photo
 * is a frontend-only preview: visible to any role viewed in this same tab
 * (including across a demo persona switch, or an authority account in the
 * real deployed app if you happen to test both in one tab), but gone on
 * reload or in a new tab — in the demo build *and* the real
 * Vercel/EC2-deployed app alike, since nothing here is stored server-side.
 */

export type LocalPhotoKind = 'grievance' | 'recommendation';

const store = new Map<string, string>();

function key(kind: LocalPhotoKind, id: string): string {
  return `${kind}:${id}`;
}

/** Stash a photo (as a data URL) for one record. */
export function setLocalPhoto(kind: LocalPhotoKind, id: string, dataUrl: string): void {
  store.set(key(kind, id), dataUrl);
}

/** The stashed photo for one record, or null if the citizen didn't attach one. */
export function getLocalPhoto(kind: LocalPhotoKind, id: string): string | null {
  return store.get(key(kind, id)) ?? null;
}

/**
 * A camera photo straight off a phone can be several megabytes at 3000+ px
 * on a side. Held as a base64 data URL and decoded by two `<img>` elements
 * (the table thumbnail and the lightbox), that's the actual source of the
 * "takes a while to open" lag — not the click handler. Cap the longest side
 * so both decode fast; this is a preview, not the evidence record.
 */
const MAX_DIMENSION_PX = 1280;
const JPEG_QUALITY = 0.82;

function readRawDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

/** True in every real browser; false in jsdom, which has no canvas backend. */
function canDownscale(): boolean {
  try {
    return document.createElement('canvas').getContext('2d') !== null;
  } catch {
    return false;
  }
}

function downscale(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(img.naturalWidth, img.naturalHeight));
      if (scale >= 1) {
        // Already small enough — redrawing would only cost quality for nothing.
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error('Could not decode the image.'));
    img.src = dataUrl;
  });
}

/**
 * Reads a `File` into a data URL, for handing to {@link setLocalPhoto}.
 * Downscales large photos first (see {@link MAX_DIMENSION_PX}) so both the
 * table thumbnail and the lightbox preview stay fast to decode.
 */
export async function readFileAsDataUrl(file: File): Promise<string> {
  const raw = await readRawDataUrl(file);
  if (!canDownscale()) return raw;
  try {
    return await downscale(raw);
  } catch {
    return raw;
  }
}
