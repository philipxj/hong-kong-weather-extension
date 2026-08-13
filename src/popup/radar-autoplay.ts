import { imageryAutoplayStep, parseImageryPosition } from "./imagery-autoplay";

const RADAR_AUTOPLAY_MS = 800;
const MANUAL_INTERACTION_PAUSE_MS = 3000;
const READY_RETRY_MS = 120;

const imageryOpen = document.querySelector<HTMLElement>("#imagery-open");
const imageryImage = document.querySelector<HTMLImageElement>("#imagery-image");
const imageryPosition = document.querySelector<HTMLElement>("#imagery-position");
const radarRanges = document.querySelector<HTMLElement>("#radar-ranges");
const imageryTabs = document.querySelectorAll<HTMLButtonElement>(".imagery-tab");

let autoplayTimer: number | undefined;

if (imageryOpen && imageryImage && imageryPosition && radarRanges) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const isRadarActive = (): boolean =>
    imageryOpen.dataset.imagery === "radar" && !imageryOpen.hidden;

  const stopAutoplay = (): void => {
    if (autoplayTimer === undefined) return;
    window.clearTimeout(autoplayTimer);
    autoplayTimer = undefined;
  };

  const currentPosition = () => parseImageryPosition(imageryPosition.textContent ?? "");

  const clearSyntheticStepFeedback = (): void => {
    imageryOpen.classList.remove("is-stepping-left", "is-stepping-right");
  };

  const dispatchStep = (direction: -1 | 1, steps = 1, capturedUrls?: Set<string>): void => {
    for (let step = 0; step < steps; step += 1) {
      imageryOpen.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: direction < 0 ? "ArrowLeft" : "ArrowRight",
          bubbles: true,
          cancelable: true
        })
      );
      clearSyntheticStepFeedback();
      const url = imageryImage.currentSrc || imageryImage.src;
      if (url) capturedUrls?.add(url);
    }
  };

  const preloadUrls = (urls: Iterable<string>): void => {
    for (const url of urls) {
      const image = new Image();
      image.src = url;
    }
  };

  const rewindToFirstFrameAndPreload = (): boolean => {
    const position = currentPosition();
    if (!position || !isRadarActive()) return false;

    const urls = new Set<string>();
    const currentUrl = imageryImage.currentSrc || imageryImage.src;
    if (currentUrl) urls.add(currentUrl);

    if (position.index > 1) {
      dispatchStep(-1, position.index - 1, urls);
    }

    preloadUrls(urls);
    return true;
  };

  const scheduleAutoplay = (delay = RADAR_AUTOPLAY_MS): void => {
    stopAutoplay();
    if (prefersReducedMotion.matches || !isRadarActive()) return;
    autoplayTimer = window.setTimeout(runAutoplayStep, delay);
  };

  const runAutoplayStep = (): void => {
    autoplayTimer = undefined;
    if (prefersReducedMotion.matches || !isRadarActive()) return;

    const position = currentPosition();
    if (!position) {
      scheduleAutoplay(READY_RETRY_MS);
      return;
    }

    const next = imageryAutoplayStep(position);
    dispatchStep(next.direction, next.steps);
    scheduleAutoplay();
  };

  const startAutoplay = ({ rewind = false }: { rewind?: boolean } = {}): void => {
    stopAutoplay();
    if (prefersReducedMotion.matches || !isRadarActive()) return;

    if (rewind && !rewindToFirstFrameAndPreload()) {
      scheduleAutoplay(READY_RETRY_MS);
      return;
    }

    if (!currentPosition()) {
      scheduleAutoplay(READY_RETRY_MS);
      return;
    }

    scheduleAutoplay();
  };

  const pauseForManualInteraction = (): void => {
    if (!isRadarActive()) return;
    stopAutoplay();
    autoplayTimer = window.setTimeout(() => startAutoplay(), MANUAL_INTERACTION_PAUSE_MS);
  };

  imageryOpen.addEventListener("pointerdown", (event) => {
    if (event.isTrusted) pauseForManualInteraction();
  });

  imageryOpen.addEventListener("keydown", (event) => {
    if (!event.isTrusted) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      pauseForManualInteraction();
    }
  });

  radarRanges.addEventListener("pointerdown", (event) => {
    if (event.isTrusted) pauseForManualInteraction();
  });

  imageryTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      window.setTimeout(() => {
        if (isRadarActive()) {
          startAutoplay({ rewind: true });
        } else {
          stopAutoplay();
        }
      }, 0);
    });
  });

  const observer = new MutationObserver(() => {
    if (!isRadarActive()) {
      stopAutoplay();
      return;
    }
    if (autoplayTimer === undefined) startAutoplay();
  });
  observer.observe(imageryOpen, { attributes: true, attributeFilter: ["data-imagery", "hidden"] });

  prefersReducedMotion.addEventListener("change", () => {
    if (prefersReducedMotion.matches) {
      stopAutoplay();
    } else {
      startAutoplay({ rewind: true });
    }
  });

  startAutoplay({ rewind: true });
}
