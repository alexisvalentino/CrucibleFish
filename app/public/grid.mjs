export function nextRovingIndex(index, key, count, columns) {
  if (!count) return -1;
  const current = Math.max(0, Math.min(Number(index) || 0, count - 1));
  const width = Math.max(1, Number(columns) || 1);
  const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: width, ArrowUp: -width }[key];
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (!delta) return current;
  return Math.max(0, Math.min(current + delta, count - 1));
}
