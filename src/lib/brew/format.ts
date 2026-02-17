export function formatSeconds(totalSec: number): string {
  const safeSec = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(safeSec / 60);
  const seconds = safeSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function toRatioLabel(waterGrams: number, doseGrams: number): string {
  if (doseGrams <= 0) return "-";
  return `1:${(waterGrams / doseGrams).toFixed(1)}`;
}
