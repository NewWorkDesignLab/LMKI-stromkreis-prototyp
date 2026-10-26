/* Zahleneingaben mit Einheit, wie Lernende sie tippen: „29 mA“, „0,029“, „220 Ohm“,
   „0,22 kΩ“. Ergebnis ist immer der Wert in der Grundeinheit der Frage. */

/** Vorsätze, die in der Elektrotechnik-Ausbildung vorkommen. */
const PREFIX: Record<string, number> = { µ: 1e-6, u: 1e-6, m: 1e-3, k: 1e3, M: 1e6 };

/** Schreibweisen je Grundeinheit; die erste ist die Anzeigeform. */
const UNIT_ALIASES: Record<string, string[]> = {
  Ω: ["Ω", "Ohm", "ohm"],
  A: ["A"],
  V: ["V"],
  W: ["W"],
};

export const unitAliases = (unit: string): string[] => UNIT_ALIASES[unit] ?? [unit];

export type Parsed = { value: number } | { error: string };

/** Liest eine Eingabe. Ohne Einheit gilt die Grundeinheit der Frage. */
export function parseQuantity(text: string, unit: string): Parsed {
  const m = /^([+-]?\d+(?:[.,]\d+)?|[+-]?[.,]\d+)\s*(\S*)$/.exec(text.trim());
  if (!m) return { error: "Bitte eine Zahl eingeben, zum Beispiel 220 oder 0,22 k." };
  const n = Number(m[1].replace(",", "."));
  const suffix = m[2];
  if (!suffix) return { value: n };
  for (const alias of unitAliases(unit)) {
    if (suffix === alias) return { value: n };
    if (suffix.endsWith(alias)) {
      const f = PREFIX[suffix.slice(0, -alias.length)];
      if (f) return { value: n * f };
    }
  }
  /* nur ein Vorsatz ohne Einheit, etwa „0,22k“ */
  if (PREFIX[suffix]) return { value: n * PREFIX[suffix] };
  return { error: `Die Einheit „${suffix}“ passt nicht – gefragt ist ${unit}.` };
}

/** Eine Zahl ohne Einheit und Vorsatz, mit Komma oder Punkt. Die Einheit steht am Eingabefeld;
    was dort nicht steht, wird nicht umgedeutet („99 m“ ist keine Zahl). */
export function parsePlainNumber(text: string): number | null {
  const t = text.trim();
  return /^[+-]?(\d+([.,]\d+)?|[.,]\d+)$/.test(t) ? Number(t.replace(",", ".")) : null;
}

/** Standardtoleranz: 2 % – genug für Rundung auf ganze Stellen, zu eng für Raten. */
export const DEFAULT_TOLERANCE = 0.02;

export function withinTolerance(value: number, expected: number, tolerance = DEFAULT_TOLERANCE) {
  if (expected === 0) return Math.abs(value) <= tolerance;
  return Math.abs(value - expected) <= Math.abs(expected) * tolerance;
}
