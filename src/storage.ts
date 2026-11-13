// Per-browser settings, kept in extension storage so they survive reloads and
// reach every GitHub tab.

export const readSetting = async (key: string): Promise<unknown> =>
  (await chrome.storage.local.get(key))[key];

export const writeSetting = (key: string, value: unknown): Promise<void> =>
  chrome.storage.local.set({ [key]: value });
