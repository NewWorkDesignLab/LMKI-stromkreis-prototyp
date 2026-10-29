/* Einstellungen der Lernenden: Erleichterungen und Darstellung. Sie ändern nie, was als
   gelöst gilt – nur, wie bequem man dorthin kommt und was man dabei sieht und hört. */

export interface Settings {
  /** Ziehhilfe: erreichte Punkte verbinden sich mit Anschlüssen, die darauf zeigen */
  snapWires: boolean;
  /** Töne an/aus (die Töne selbst kommen mit Phase 6) */
  sound: boolean;
  /** Lautstärke 0 … 1 */
  volume: number;
  /** laufende Striche in stromführenden Leitungen */
  flowAnimation: boolean;
  /** Aufgabe beim Betreten eines Bauschritts kurz hervorheben */
  taskIntro: boolean;
  /** Entwicklung: im Bauschritt sonst unsichtbare Hintergrunddaten anzeigen (DebugPanel) */
  debug: boolean;
}

/* Die Ziehhilfe ist aus: dass nur verbunden ist, was man selbst verbindet, ist die
   Grundregel des Bretts. Wer sie verstanden hat, kann sich die Arbeit erleichtern. */
export const DEFAULT_SETTINGS: Settings = {
  snapWires: false,
  sound: true,
  volume: 0.6,
  flowAnimation: true,
  taskIntro: true,
  debug: false,
};

/* Gespeicherte Einstellungen sind Fremddaten (alter Stand, von Hand geändert). Jedes Feld
   wird einzeln geprüft; was fehlt oder nicht passt, bekommt seinen Standardwert. Das ist
   hier gewollt und kein verschluckter Fehler: eine kaputte Einstellung soll die
   Anwendung nicht am Start hindern, und es geht nichts verloren, was man nicht mit einem
   Klick wieder einstellt. */
export function readSettings(raw: unknown): Settings {
  // Objekt ist geprüft; jedes Feld wird unten einzeln auf seinen Typ geprüft
  const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const bool = (k: "snapWires" | "sound" | "flowAnimation" | "taskIntro" | "debug") =>
    typeof o[k] === "boolean" ? o[k] : DEFAULT_SETTINGS[k];
  const v = o.volume;
  return {
    snapWires: bool("snapWires"),
    sound: bool("sound"),
    volume:
      typeof v === "number" && Number.isFinite(v)
        ? Math.min(1, Math.max(0, v))
        : DEFAULT_SETTINGS.volume,
    flowAnimation: bool("flowAnimation"),
    taskIntro: bool("taskIntro"),
    debug: bool("debug"),
  };
}

/* Speicher für Einstellungen. Wie beim ProgressStore kennt der Rest nur das Interface. */
export interface SettingsStore {
  load(): Settings;
  save(s: Settings): void;
}

export class MemorySettingsStore implements SettingsStore {
  private value: Settings;
  constructor(initial: Partial<Settings> = {}) {
    this.value = readSettings({ ...DEFAULT_SETTINGS, ...initial });
  }
  load() {
    return this.value;
  }
  save(s: Settings) {
    this.value = s;
  }
}

/** Ausschnitt aus der Web-Storage-API – im Test durch ein einfaches Objekt ersetzbar. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = "stromkreis.settings";

/* Einstellungen im Browser. Unlesbares JSON gilt wie fehlende Werte (siehe readSettings);
   ist der Speicher gesperrt (privates Fenster, Kontingent), gilt die Einstellung nur bis
   zum Neuladen. Der Speicher wird erst beim Zugriff geholt, weil schon `window.localStorage`
   selbst werfen kann, wenn der Browser ihn sperrt. */
export class StorageSettingsStore implements SettingsStore {
  constructor(private storage: () => KeyValueStorage) {}
  load() {
    try {
      return readSettings(JSON.parse(this.storage().getItem(KEY) ?? "null"));
    } catch {
      return readSettings(null);
    }
  }
  save(s: Settings) {
    try {
      this.storage().setItem(KEY, JSON.stringify(s));
    } catch {
      /* gesperrter Speicher: siehe oben */
    }
  }
}
