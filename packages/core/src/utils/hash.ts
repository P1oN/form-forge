const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export const hashBytes = async (data: ArrayBuffer): Promise<string> => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API is required for hashing.');
  }

  const digest = await subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
};
