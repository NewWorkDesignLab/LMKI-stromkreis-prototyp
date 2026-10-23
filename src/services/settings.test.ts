import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, StorageSettingsStore, readSettings } from "./settings";

const memoryStorage = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => m.set(k, v),
  };
};

describe("Einstellungen", () => {
  it("ergänzt fehlende und falsche Felder mit ihren Standardwerten", () => {
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(readSettings({ snapWires: true, sound: "ja", volume: 7 })).toEqual({
      ...DEFAULT_SETTINGS,
      snapWires: true,
      volume: 1,
    });
  });

  it("merkt sich die Einstellungen im Browserspeicher über ein Neuladen hinweg", () => {
    const storage = memoryStorage();
    new StorageSettingsStore(() => storage).save({ ...DEFAULT_SETTINGS, flowAnimation: false });
    expect(new StorageSettingsStore(() => storage).load().flowAnimation).toBe(false);
  });

  it("startet mit den Standardwerten, wenn der Speicher kein JSON enthält", () => {
    const storage = memoryStorage();
    storage.setItem("stromkreis.settings", "{kaputt");
    expect(new StorageSettingsStore(() => storage).load()).toEqual(DEFAULT_SETTINGS);
  });
});
