import { compactRadarRangeLabel } from "./radar-range-label";

const ranges = document.querySelector<HTMLElement>("#radar-ranges");

if (ranges) {
  const syncLabels = (): void => {
    const localizedSuffix = document.documentElement.lang === "en" ? "km" : "公里";
    ranges.querySelectorAll<HTMLButtonElement>(".radar-range").forEach((button) => {
      const rawLabel = button.textContent?.trim() ?? "";
      const labels = compactRadarRangeLabel(rawLabel, localizedSuffix);
      button.textContent = labels.visible;
      button.title = labels.accessible;
      button.setAttribute("aria-label", labels.accessible);
    });
  };

  const observer = new MutationObserver(syncLabels);
  observer.observe(ranges, { childList: true });
  syncLabels();
}
