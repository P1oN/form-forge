const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

export const jaccard = (a: string, b: string): number => {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));

  if (sa.size === 0 || sb.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of sa) {
    if (sb.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...sa, ...sb]).size;
  return intersection / union;
};
