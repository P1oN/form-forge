export const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => file.arrayBuffer();

export const downloadBlob = (name: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

export const jsonBlob = (value: unknown): Blob =>
  new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
