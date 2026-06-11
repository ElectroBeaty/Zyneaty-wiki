export type MediaType = "image" | "video" | "audio";

type VerifiedMedia = {
  contentType: string;
  extension: string;
  mediaType: MediaType;
};

const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) =>
    bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) =>
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/gif": (bytes) =>
    ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a",
  "image/webp": (bytes) => ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP",
  "video/mp4": (bytes) => ascii(bytes, 4, 4) === "ftyp",
  "video/webm": (bytes) => startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]),
  "audio/mpeg": (bytes) =>
    ascii(bytes, 0, 3) === "ID3" ||
    (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0),
  "audio/mp4": (bytes) => ascii(bytes, 4, 4) === "ftyp",
  "audio/ogg": (bytes) => ascii(bytes, 0, 4) === "OggS",
  "audio/wav": (bytes) => ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE",
  "audio/webm": (bytes) => startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]),
};

const verifiedMedia: Record<string, VerifiedMedia> = {
  "image/jpeg": { contentType: "image/jpeg", extension: "jpg", mediaType: "image" },
  "image/png": { contentType: "image/png", extension: "png", mediaType: "image" },
  "image/gif": { contentType: "image/gif", extension: "gif", mediaType: "image" },
  "image/webp": { contentType: "image/webp", extension: "webp", mediaType: "image" },
  "video/mp4": { contentType: "video/mp4", extension: "mp4", mediaType: "video" },
  "video/webm": { contentType: "video/webm", extension: "webm", mediaType: "video" },
  "audio/mpeg": { contentType: "audio/mpeg", extension: "mp3", mediaType: "audio" },
  "audio/mp4": { contentType: "audio/mp4", extension: "m4a", mediaType: "audio" },
  "audio/ogg": { contentType: "audio/ogg", extension: "ogg", mediaType: "audio" },
  "audio/wav": { contentType: "audio/wav", extension: "wav", mediaType: "audio" },
  "audio/webm": { contentType: "audio/webm", extension: "webm", mediaType: "audio" },
};

export const maxMediaSize = 50 * 1024 * 1024;

export async function verifyMediaFile(file: File) {
  const expected = verifiedMedia[file.type];

  if (!expected) {
    throw new Error("Nur gepruefte Bild-, Video- oder Audiodateien sind erlaubt.");
  }

  if (file.size > maxMediaSize) {
    throw new Error("Die Datei ist zu gross. Maximal erlaubt sind 50 MB.");
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const matchesSignature = signatures[file.type]?.(head) ?? false;

  if (!matchesSignature) {
    throw new Error("Der Dateiinhalt passt nicht zum angegebenen Dateityp.");
  }

  return expected;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}
