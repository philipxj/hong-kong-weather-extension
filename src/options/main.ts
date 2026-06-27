import { optionsCopy } from "./options-copy";
import {
  ALL_BADGE_WARNING_CATEGORIES,
  ALL_NOTIFICATION_WARNING_CATEGORIES,
  getCachedWeather,
  getSettings,
  refreshWeather,
  saveSettings,
  updateBadge
} from "../shared/weather-service";
import { optionsSaveAction } from "./save-action";
import { browserApi } from "../shared/browser-api";
import type {
  BadgeWarningCategory,
  Language,
  NotificationWarningCategory,
  Settings
} from "../shared/types";

const form = query<HTMLFormElement>("#options-form");
const status = query<HTMLElement>("#save-status");
const testNotificationRow = query<HTMLElement>("#notification-test-row");
const testNotificationButton = query<HTMLButtonElement>("#test-notification");
const appVersion = query<HTMLElement>("#app-version");

const settings = await getSettings();
hydrate(settings);
applyOptionsLanguage(settings.language);
renderAppVersion();
renderDevDebugControls();

type TestNotificationResponse =
  | {
      ok: true;
      notification: { id: string; permission: string; visibleInChrome: boolean };
    }
  | { ok: false; error: string };

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
  const selectedCategories = new Set(values.notifyWarningCategories);
  for (const input of queryAll<HTMLInputElement>('input[name="notifyWarningCategories"]', form)) {
    input.checked = selectedCategories.has(input.value as NotificationWarningCategory);
  }
  const selectedBadgeCategories = new Set(values.badgeWarningCategories);
  for (const input of queryAll<HTMLInputElement>('input[name="badgeWarningCategories"]', form)) {
    input.checked = selectedBadgeCategories.has(input.value as BadgeWarningCategory);
  }
  query<HTMLSelectElement>("#badgeMode", form).value = values.badgeMode;
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
    notifyWarningCategories: readNotificationWarningCategories(),
    badgeWarningCategories: readBadgeWarningCategories(),
    badgeMode: query<HTMLSelectElement>("#badgeMode", form).value as Settings["badgeMode"],
    currentRefreshMinutes: clampNumber(
      query<HTMLInputElement>("#currentRefreshMinutes", form).value,
      10,
      180,
      15
    ),
    warningCheckMinutes: clampNumber(
      query<HTMLInputElement>("#warningCheckMinutes", form).value,
      5,
      180,
      5
    )
  };
}

function readNotificationWarningCategories(): NotificationWarningCategory[] {
  const selected = queryAll<HTMLInputElement>('input[name="notifyWarningCategories"]:checked', form)
    .map((input) => input.value)
    .filter((value): value is NotificationWarningCategory =>
      ALL_NOTIFICATION_WARNING_CATEGORIES.includes(value as NotificationWarningCategory)
    );
  return selected;
}

function readBadgeWarningCategories(): BadgeWarningCategory[] {
  const selected = queryAll<HTMLInputElement>('input[name="badgeWarningCategories"]:checked', form)
    .map((input) => input.value)
    .filter((value): value is BadgeWarningCategory =>
      ALL_BADGE_WARNING_CATEGORIES.includes(value as BadgeWarningCategory)
    );
  return selected;
}

async function save(): Promise<void> {
  const next = readForm();
  const action = optionsSaveAction(settings, next);
  await saveSettings(next);

  if (action === "refresh-weather") {
    const weather = await refreshWeather(next);
    await updateBadge(weather, next);
  } else if (action === "update-badge") {
    await updateBadge(await getCachedWeather(), next);
  }

  Object.assign(settings, next);
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
    const response = await browserApi.runtime.sendMessage<TestNotificationResponse>({
      type: "testNotification",
      language
    });
    if (!response?.ok) throw new Error(response?.error ?? "Notification test failed");
    status.textContent = response.notification.visibleInChrome
      ? copy.testNotificationSent
      : copy.testNotificationCreatedNoPopup;
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
  document.title = `香港天氣預報 ${copy.options}`;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n as keyof typeof copy | undefined;
    if (!key) return;
    element.textContent = copy[key];
  });
}

function renderAppVersion(): void {
  const version = browserApi.runtime.getManifest().version;
  appVersion.textContent = version ? `v${version}` : "";
}

function renderDevDebugControls(): void {
  if (import.meta.env.DEV) {
    testNotificationRow.hidden = false;
    return;
  }

  testNotificationRow.remove();
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

function queryAll<T extends Element>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}
