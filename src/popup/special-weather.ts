export function formatSpecialWeatherTips(tips: string[]): string | null {
  const text = tips
    .map((tip) => tip.trim())
    .filter(Boolean)
    .join("、");

  return text || null;
}
