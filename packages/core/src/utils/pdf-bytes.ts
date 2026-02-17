const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const HEADER_SEARCH_LIMIT = 2048;

export const findPdfHeaderOffset = (data: ArrayBuffer): number => {
  const bytes = new Uint8Array(data);
  if (bytes.length < PDF_HEADER.length) {
    return -1;
  }

  const maxStart = Math.min(bytes.length - PDF_HEADER.length, HEADER_SEARCH_LIMIT - PDF_HEADER.length);
  for (let idx = 0; idx <= maxStart; idx += 1) {
    if (
      bytes[idx] === PDF_HEADER[0] &&
      bytes[idx + 1] === PDF_HEADER[1] &&
      bytes[idx + 2] === PDF_HEADER[2] &&
      bytes[idx + 3] === PDF_HEADER[3] &&
      bytes[idx + 4] === PDF_HEADER[4]
    ) {
      return idx;
    }
  }

  return -1;
};

export const normalizePdfArrayBuffer = (data: ArrayBuffer): ArrayBuffer => {
  const headerOffset = findPdfHeaderOffset(data);
  if (headerOffset <= 0) {
    return data;
  }
  return data.slice(headerOffset);
};
