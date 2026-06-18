import { optionsCopy } from "./options-copy";
import {
  getSettings,
  refreshWeather,
  saveSettings,
  sendTestNotification,
  updateBadge
} from "../shared/weather-service";
import type { Language, Settings } from "../shared/types";

const form = query<HTMLFormElement>("#options-form");
const status = query<HTMLElement>("#save-status");
const testNotificationButton = query<HTMLButtonElement>("#test-notification");

const settings = await getSettings();
hydrate(settings);
applyOptionsLanguage(settings.language);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void save();
});
form.addEventListener("change", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.name === "language") {
    applyOptionsLanguage(target.value as Language);
  }
});
testNotificationButton.addEventListener("click", () => {
  void testNotification();
});

function hydrate(values: Settings): void {
  query<HTMLInputElement>(`input[name="language"][value="${values.language}"]`, form).checked =
    true;
  query<HTMLInputElement>("#notifyIssued", form).checked = values.notifyIssued;
  query<HTMLInputElement>("#notifyCancelled", form).checked = values.notifyCancelled;
  query<HTMLInputElement>("#notifyExtended", form).checked = values.notifyExtended;
  query<HTMLInputElement>("#notifyUpdated", form).checked = values.notifyUpdated;
  query<HTMLSelectElement>("#badgeMode", form).value = values.badgeMode;
  query<HTMLInputElement>("#compactMode", form).checked = values.compactMode;
  query<HTMLInputElement>("#currentRefreshMinutes", form).value = String(
    values.currentRefreshMinutes
  );
  query<HTMLInputElement>("#warningCheckMinutes", form).value = String(values.warningCheckMinutes);
}

function readForm(): Settings {
  return {
    language: query<HTMLInputElement>('input[name="language"]:checked', form)
      .value as Settings["language"],
    notifyIssued: query<HTMLInputElement>("#notifyIssued", form).checked,
    notifyCancelled: query<HTMLInputElement>("#notifyCancelled", form).checked,
    notifyExtended: query<HTMLInputElement>("#notifyExtended", form).checked,
    notifyUpdated: query<HTMLInputElement>("#notifyUpdated", form).checked,
    badgeMode: query<HTMLSelectElement>("#badgeMode", form).value as Settings["badgeMode"],
    compactMode: query<HTMLInputElement>("#compactMode", form).checked,
    currentRefreshMinutes: clampNumber(
      query<HTMLInputElement>("#currentRefreshMinutes", form).value,
      5,
      180,
      10
    ),
    warningCheckMinutes: clampNumber(
      query<HTMLInputElement>("#warningCheckMinutes", form).value,
      3,
      180,
      5
    )
  };
}

async function save(): Promise<void> {
  const next = readForm();
  await saveSettings(next);
  const weather = await refreshWeather(next);
  await updateBadge(weather, next);
  status.textContent = optionsCopy(next.language).saved;
  setTimeout(() => {
    status.textContent = "";
  }, 1800);
}

async function testNotification(): Promise<void> {
  const language = query<HTMLInputElement>('input[name="language"]:checked', form)
    .value as Settings["language"];
  const copy = optionsCopy(language);
  try {
    await sendTestNotification(language);
    status.textContent = copy.testNotificationSent;
  } catch {
    status.textContent = copy.testNotificationFailed;
  }
  setTimeout(() => {
    status.textContent = "";
  }, 2200);
}

function applyOptionsLanguage(language: Language): void {
  const copy = optionsCopy(language);
  document.documentElement.lang =
    language === "en" ? "en" : language === "sc" ? "zh-Hans" : "zh-Hant";
  document.title = `HK Weather Alerts ${copy.options}`;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n as keyof typeof copy | undefined;
    if (!key) return;
    element.textContent = copy[key];
  });
}

function clampNumber(value: string, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function query<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}
