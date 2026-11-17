const maxImageBytes = 3 * 1024 * 1024;
const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

type InlineImage = {
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  bytes: Buffer;
};

function isSupportedMimeType(value: string): value is InlineImage["mimeType"] {
  return value === "image/png" || value === "image/jpeg" || value === "image/webp";
}

function decodeInlineImage(value: string): InlineImage | null {
  if (value.length > 4 * Math.ceil(maxImageBytes / 3) + 32) return null;

  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/u.exec(
    value,
  );
  if (!match) return null;

  const bytes = Buffer.from(match[2], "base64");
  const mimeType = match[1];
  if (
    !isSupportedMimeType(mimeType) ||
    bytes.length === 0 ||
    bytes.length > maxImageBytes ||
    bytes.toString("base64") !== match[2]
  ) {
    return null;
  }

  return {
    mimeType,
    bytes,
  };
}

export function isValidPngDataUrl(value: string) {
  const image = decodeInlineImage(value);
  return (
    image?.mimeType === "image/png" &&
    pngSignature.every((byte, index) => image.bytes[index] === byte)
  );
}

export function isValidPracticeImageDataUrl(value: string) {
  const image = decodeInlineImage(value);
  if (!image) return false;

  if (image.mimeType === "image/png") {
    return pngSignature.every((byte, index) => image.bytes[index] === byte);
  }
  if (image.mimeType === "image/jpeg") {
    return image.bytes[0] === 0xff && image.bytes[1] === 0xd8 && image.bytes[2] === 0xff;
  }
  return (
    image.bytes.toString("ascii", 0, 4) === "RIFF" &&
    image.bytes.toString("ascii", 8, 12) === "WEBP"
  );
}
