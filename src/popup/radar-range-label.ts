export interface CompactRadarRangeLabel {
  accessible: string;
  visible: string;
}

export function compactRadarRangeLabel(
  label: string,
  localizedSuffix: string
): CompactRadarRangeLabel {
  const match = label.match(/^(.*)km$/i);
  if (!match) return { accessible: label, visible: label };

  const visible = match[1] ?? label;
  return {
    accessible: `${visible}${localizedSuffix}`,
    visible
  };
}
