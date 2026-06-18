type StorageRecord<T> = Record<string, T | undefined>;
type BadgeBackgroundColorDetails = Parameters<typeof chrome.action.setBadgeBackgroundColor>[0];
type IconDetails = Parameters<typeof chrome.action.setIcon>[0];
type NotificationCreateOptions = Parameters<typeof chrome.notifications.create>[0];
type TitleDetails = Parameters<typeof chrome.action.setTitle>[0];

export const browserApi = {
  storage: {
    sync: {
      get: async <T>(key: string): Promise<StorageRecord<T>> => chrome.storage.sync.get(key),
      set: (items: Record<string, unknown>) => chrome.storage.sync.set(items)
    },
    local: {
      get: async <T>(key: string): Promise<StorageRecord<T>> => chrome.storage.local.get(key),
      set: (items: Record<string, unknown>) => chrome.storage.local.set(items)
    },
    onChanged: (
      callback: (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: chrome.storage.AreaName
      ) => void | Promise<void>
    ) => {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        void callback(changes, areaName);
      });
    }
  },
  alarms: {
    create: (name: string, info: chrome.alarms.AlarmCreateInfo) => chrome.alarms.create(name, info),
    onAlarm: (callback: (alarm: chrome.alarms.Alarm) => void | Promise<void>) => {
      chrome.alarms.onAlarm.addListener((alarm) => {
        void callback(alarm);
      });
    }
  },
  action: {
    setBadgeText: (details: chrome.action.BadgeTextDetails) => chrome.action.setBadgeText(details),
    setBadgeBackgroundColor: (details: BadgeBackgroundColorDetails) =>
      chrome.action.setBadgeBackgroundColor(details),
    setIcon: (details: IconDetails) => chrome.action.setIcon(details),
    setTitle: (details: TitleDetails) => chrome.action.setTitle(details)
  },
  notifications: {
    create: (details: NotificationCreateOptions) => chrome.notifications.create(details)
  },
  runtime: {
    getUrl: (path: string) => chrome.runtime.getURL(path),
    onInstalled: (callback: () => void | Promise<void>) => {
      chrome.runtime.onInstalled.addListener(() => {
        void callback();
      });
    },
    onStartup: (callback: () => void | Promise<void>) => {
      chrome.runtime.onStartup.addListener(() => {
        void callback();
      });
    },
    onMessage: <TMessage, TResponse>(
      handler: (message: TMessage) => Promise<TResponse | undefined> | TResponse | undefined
    ) => {
      chrome.runtime.onMessage.addListener((message: TMessage, _sender, sendResponse) => {
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
    openOptionsPage: () => chrome.runtime.openOptionsPage(),
    sendMessage: <TResponse>(message: unknown) =>
      chrome.runtime.sendMessage<unknown, TResponse>(message)
  },
  tabs: {
    create: (details: chrome.tabs.CreateProperties) => chrome.tabs.create(details)
  }
};
