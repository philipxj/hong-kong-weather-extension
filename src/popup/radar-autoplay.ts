import {
  canRunImageryPlayback,
  imageryAutoplayStep,
  imageryManualResumeDelay,
  imagerySliderStep,
  initialImageryPlaybackState,
  parseImageryPosition,
  reduceImageryPlaybackState
} from "./imagery-autoplay";

const RADAR_AUTOPLAY_MS = 800;
const READY_RETRY_MS = 120;

const imageryOpen = document.querySelector<HTMLElement>("#imagery-open");
const imageryImage = document.querySelector<HTMLImageElement>("#imagery-image");
const imageryPosition = document.querySelector<HTMLElement>("#imagery-position");
const radarRanges = document.querySelector<HTMLElement>("#radar-ranges");
const imageryTabs = document.querySelectorAll<HTMLButtonElement>(".imagery-tab");
const playback = document.querySelector<HTMLElement>("#radar-playback");
const playToggle = document.querySelector<HTMLButtonElement>("#radar-play-toggle");
const playbackSlider = document.querySelector<HTMLInputElement>("#radar-playback-slider");
const playbackPosition = document.querySelector<HTMLOutputElement>("#radar-playback-position");

if (
  imageryOpen &&
  imageryImage &&
  imageryPosition &&
  radarRanges &&
  playback &&
  playToggle &&
  playbackSlider &&
  playbackPosition
) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let playbackState = initialImageryPlaybackState(prefersReducedMotion.matches);
  let autoplayTimer: number | undefined;
  let manualResumeTimer: number | undefined;

  const isRadarActive = (): boolean =>
    imageryOpen.dataset.imagery === "radar" && !imageryOpen.hidden;

  const currentPosition = () => parseImageryPosition(imageryPosition.textContent ?? "");

  const playbackCopy = () => {
    const language = document.documentElement.lang.toLowerCase();
    if (language.startsWith("en")) {
      return {
        pause: "Pause radar animation",
        play: "Play radar animation",
        slider: "Radar animation frame"
      };
    }
    if (language.includes("hans") || language.startsWith("zh-cn")) {
      return {
        pause: "暂停雷达动画",
        play: "播放雷达动画",
        slider: "雷达动画帧"
      };
    }
    return {
      pause: "暫停雷達動畫",
      play: "播放雷達動畫",
      slider: "雷達動畫格數"
    };
  };

  const stopAutoplay = (): void => {
    if (autoplayTimer === undefined) return;
    window.clearTimeout(autoplayTimer);
    autoplayTimer = undefined;
  };

  const clearManualResume = (): void => {
    if (manualResumeTimer === undefined) return;
    window.clearTimeout(manualResumeTimer);
    manualResumeTimer = undefined;
  };

  const syncControls = (): void => {
    const position = currentPosition();
    const ready = isRadarActive() && position !== null;
    const playing = canRunImageryPlayback(playbackState);
    const labels = playbackCopy();

    playback.hidden = !ready;
    playback.dataset.playing = String(playing);
    playToggle.setAttribute("aria-pressed", String(!playing));
    playToggle.setAttribute("aria-label", playing ? labels.pause : labels.play);
    playToggle.title = playing ? labels.pause : labels.play;
    playbackSlider.setAttribute("aria-label", labels.slider);
    playbackSlider.disabled = !ready;

    if (!position) {
      playbackSlider.min = "1";
      playbackSlider.max = "1";
      playbackSlider.value = "1";
      playbackPosition.textContent = "-- / --";
      return;
    }

    playbackSlider.min = "1";
    playbackSlider.max = String(position.count);
    playbackSlider.value = String(position.index);
    playbackSlider.setAttribute("aria-valuetext", `${position.index} / ${position.count}`);
    playbackPosition.textContent = `${position.index}/${position.count}`;
  };

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
    syncControls();
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
    if (position.index > 1) dispatchStep(-1, position.index - 1, urls);
    preloadUrls(urls);
    return true;
  };

  const scheduleAutoplay = (delay = RADAR_AUTOPLAY_MS): void => {
    stopAutoplay();
    if (!canRunImageryPlayback(playbackState) || !isRadarActive()) return;
    autoplayTimer = window.setTimeout(runAutoplayStep, delay);
  };

  const runAutoplayStep = (): void => {
    autoplayTimer = undefined;
    if (!canRunImageryPlayback(playbackState) || !isRadarActive()) return;

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
    if (!isRadarActive()) {
      syncControls();
      return;
    }

    if (rewind && !rewindToFirstFrameAndPreload()) {
      syncControls();
      if (canRunImageryPlayback(playbackState)) scheduleAutoplay(READY_RETRY_MS);
      return;
    }

    syncControls();
    if (!canRunImageryPlayback(playbackState)) return;
    if (!currentPosition()) {
      scheduleAutoplay(READY_RETRY_MS);
      return;
    }
    scheduleAutoplay();
  };

  const pauseForManualInteraction = (): void => {
    if (!isRadarActive()) return;
    stopAutoplay();
    clearManualResume();
    if (!canRunImageryPlayback(playbackState)) return;
    manualResumeTimer = window.setTimeout(() => {
      manualResumeTimer = undefined;
      startAutoplay();
    }, imageryManualResumeDelay());
  };

  playback.addEventListener("pointerdown", (event) => event.stopPropagation());
  playback.addEventListener("click", (event) => event.stopPropagation());
  playback.addEventListener("dblclick", (event) => event.stopPropagation());
  playback.addEventListener("keydown", (event) => event.stopPropagation());

  playToggle.addEventListener("click", () => {
    clearManualResume();
    if (canRunImageryPlayback(playbackState)) {
      playbackState = reduceImageryPlaybackState(playbackState, { type: "pause" });
      stopAutoplay();
      syncControls();
      return;
    }

    playbackState = reduceImageryPlaybackState(playbackState, { type: "play" });
    startAutoplay();
  });

  const selectSliderFrame = (): void => {
    const position = currentPosition();
    if (!position || !isRadarActive()) return;
    const step = imagerySliderStep(position, Number(playbackSlider.value));
    if (step) dispatchStep(step.direction, step.steps);
    pauseForManualInteraction();
  };

  playbackSlider.addEventListener("pointerdown", pauseForManualInteraction);
  playbackSlider.addEventListener("input", selectSliderFrame);
  playbackSlider.addEventListener("change", pauseForManualInteraction);

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
  radarRanges.addEventListener("click", () => {
    window.setTimeout(() => {
      clearManualResume();
      startAutoplay({ rewind: true });
    }, 0);
  });

  imageryTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      window.setTimeout(() => {
        clearManualResume();
        if (isRadarActive()) startAutoplay({ rewind: true });
        else {
          stopAutoplay();
          syncControls();
        }
      }, 0);
    });
  });

  const previewObserver = new MutationObserver(() => {
    if (!isRadarActive()) {
      stopAutoplay();
      clearManualResume();
      syncControls();
      return;
    }
    syncControls();
    if (autoplayTimer === undefined && manualResumeTimer === undefined) startAutoplay();
  });
  previewObserver.observe(imageryOpen, {
    attributes: true,
    attributeFilter: ["data-imagery", "hidden"]
  });

  const positionObserver = new MutationObserver(() => {
    syncControls();
    if (
      isRadarActive() &&
      autoplayTimer === undefined &&
      manualResumeTimer === undefined &&
      canRunImageryPlayback(playbackState)
    ) {
      startAutoplay();
    }
  });
  positionObserver.observe(imageryPosition, { childList: true, characterData: true, subtree: true });

  const languageObserver = new MutationObserver(syncControls);
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  prefersReducedMotion.addEventListener("change", () => {
    playbackState = reduceImageryPlaybackState(playbackState, {
      type: "motion-change",
      reducedMotion: prefersReducedMotion.matches
    });
    clearManualResume();
    if (canRunImageryPlayback(playbackState)) startAutoplay({ rewind: true });
    else {
      stopAutoplay();
      syncControls();
    }
  });

  syncControls();
  startAutoplay({ rewind: true });
}
