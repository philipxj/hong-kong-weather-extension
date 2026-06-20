type StorageRecord<T> = Record<string, T | undefined>;
type BadgeBackgroundColorDetails = Parameters<typeof chrome.action.setBadgeBackgroundColor>[0];
type BadgeTextColorDetails = Parameters<typeof chrome.action.setBadgeTextColor>[0];
type IconDetails = Parameters<typeof chrome.action.setIcon>[0];
type NotificationCreateOptions = Parameters<typeof chrome.notifications.create>[0];
type TitleDetails = Parameters<typeof chrome.action.setTitle>[0];
type StorageAreaName = "local" | "sync";

const fallbackStorage = {
  local: new Map<string, unknown>(),
  sync: new Map<string, unknown>()
};

function extensionApi(): typeof chrome | undefined {
  return globalThis.chrome;
}

function fallbackStorageGet<T>(areaName: StorageAreaName, key: string): Promise<StorageRecord<T>> {
  const stored = readFallbackStorageValue<T>(areaName, key);
  return Promise.resolve({ [key]: stored });
}

function fallbackStorageSet(areaName: StorageAreaName, items: Record<string, unknown>): Promise<void> {
  for (const [key, value] of Object.entries(items)) {
    fallbackStorage[areaName].set(key, value);
    writeLocalStorageValue(areaName, key, value);
  }
  return Promise.resolve();
}

function readFallbackStorageValue<T>(areaName: StorageAreaName, key: string): T | undefined {
  if (fallbackStorage[areaName].has(key)) return fallbackStorage[areaName].get(key) as T;

  const stored = readLocalStorageValue<T>(areaName, key);
  if (stored !== undefined) fallbackStorage[areaName].set(key, stored);
  return stored;
}

function readLocalStorageValue<T>(areaName: StorageAreaName, key: string): T | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(fallbackStorageKey(areaName, key));
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeLocalStorageValue(areaName: StorageAreaName, key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(fallbackStorageKey(areaName, key), JSON.stringify(value));
  } catch {
    // Some contexts block localStorage; the in-memory fallback still supports the session.
  }
}

function fallbackStorageKey(areaName: StorageAreaName, key: string): string {
  return `hk-weather-alerts:${areaName}:${key}`;
}

function fallbackAssetUrl(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("/")) return path;
  return `/${path}`;
}

export const browserApi = {
  storage: {
    sync: {
      get: async <T>(key: string): Promise<StorageRecord<T>> =>
        extensionApi()?.storage?.sync
          ? extensionApi()!.storage.sync.get(key)
          : fallbackStorageGet<T>("sync", key),
      set: (items: Record<string, unknown>) =>
        extensionApi()?.storage?.sync
          ? extensionApi()!.storage.sync.set(items)
          : fallbackStorageSet("sync", items)
    },
    local: {
      get: async <T>(key: string): Promise<StorageRecord<T>> =>
        extensionApi()?.storage?.local
          ? extensionApi()!.storage.local.get(key)
          : fallbackStorageGet<T>("local", key),
      set: (items: Record<string, unknown>) =>
        extensionApi()?.storage?.local
          ? extensionApi()!.storage.local.set(items)
          : fallbackStorageSet("local", items)
    },
    onChanged: (
      callback: (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: chrome.storage.AreaName
      ) => void | Promise<void>
    ) => {
      extensionApi()?.storage?.onChanged.addListener((changes, areaName) => {
        void callback(changes, areaName);
      });
    }
  },
  alarms: {
    create: (name: string, info: chrome.alarms.AlarmCreateInfo) =>
      extensionApi()?.alarms?.create(name, info) ?? Promise.resolve(),
    onAlarm: (callback: (alarm: chrome.alarms.Alarm) => void | Promise<void>) => {
      extensionApi()?.alarms?.onAlarm.addListener((alarm) => {
        void callback(alarm);
      });
    }
  },
  action: {
    setBadgeText: (details: chrome.action.BadgeTextDetails) =>
      extensionApi()?.action?.setBadgeText(details) ?? Promise.resolve(),
    setBadgeBackgroundColor: (details: BadgeBackgroundColorDetails) =>
      extensionApi()?.action?.setBadgeBackgroundColor(details) ?? Promise.resolve(),
    setBadgeTextColor: (details: BadgeTextColorDetails) =>
      extensionApi()?.action?.setBadgeTextColor(details) ?? Promise.resolve(),
    setIcon: (details: IconDetails) => extensionApi()?.action?.setIcon(details) ?? Promise.resolve(),
    setTitle: (details: TitleDetails) =>
      extensionApi()?.action?.setTitle(details) ?? Promise.resolve()
  },
  notifications: {
    create: (details: NotificationCreateOptions) =>
      extensionApi()?.notifications?.create(details) ?? Promise.resolve(""),
    createWithId: (id: string, details: NotificationCreateOptions) =>
      extensionApi()?.notifications?.create(id, details) ?? Promise.resolve(id),
    getAll: (): Promise<Record<string, NotificationCreateOptions>> =>
      extensionApi()?.notifications?.getAll() ?? Promise.resolve({})
  },
  runtime: {
    getUrl: (path: string) => extensionApi()?.runtime?.getURL(path) ?? fallbackAssetUrl(path),
    getManifest: () => extensionApi()?.runtime?.getManifest() ?? { version: "dev" },
    onInstalled: (callback: () => void | Promise<void>) => {
      extensionApi()?.runtime?.onInstalled.addListener(() => {
        void callback();
      });
    },
    onStartup: (callback: () => void | Promise<void>) => {
      extensionApi()?.runtime?.onStartup.addListener(() => {
        void callback();
      });
    },
    onMessage: <TMessage, TResponse>(
      handler: (message: TMessage) => Promise<TResponse | undefined> | TResponse | undefined
    ) => {
      extensionApi()?.runtime?.onMessage.addListener((message: TMessage, _sender, sendResponse) => {
        const response = handler(message);
        if (response === undefined) return false;

        Promise.resolve(response)
          .then((response) => {
            sendResponse(response ?? null);
          })
          .catch((error: unknown) => {
            sendResponse({
              ok: false,
              error: error instanceof Error ? error.message : "Request failed"
            });
          });
        return true;
      });
    },
    openOptionsPage: () => extensionApi()?.runtime?.openOptionsPage() ?? Promise.resolve(),
    sendMessage: <TResponse>(message: unknown) => {
      if (extensionApi()?.runtime?.sendMessage) {
        return extensionApi()!.runtime.sendMessage<unknown, TResponse>(message);
      }
      return Promise.reject(new Error("Extension runtime is unavailable."));
    }
  },
  tabs: {
    create: (details: chrome.tabs.CreateProperties) => {
      if (extensionApi()?.tabs?.create) return extensionApi()!.tabs.create(details);
      if (details.url) globalThis.open?.(details.url, "_blank", "noopener");
      return Promise.resolve({} as chrome.tabs.Tab);
    }
  }
};
