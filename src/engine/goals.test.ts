import { describe, expect, it } from "vitest";
import type { CheckResult, Circuit, Goal, Tried } from "../domain/types";
import { wires } from "../content/helpers";
import { shownA, shownV } from "./format";
import { advanceTried, checkLevel, measuredResults } from "./goals";
import { simulate } from "./simulate";

/* Quelle links, Lampe rechts – wie in simulate.test.ts. */
const loop = (): Circuit => ({
  parts: {
    G1: { type: "battery", x: 0, y: 1, orient: "v" },
    E1: { type: "lamp", x: 4, y: 1, orient: "v" },
  },
  wires: wires(["0,1 0,0 4,0 4,1", "0,1 0,2 4,2 4,1"]),
});

const withAmmeter = (): Circuit => {
  const c = loop();
  c.parts.A1 = { type: "ammeter", x: 2, y: 0, orient: "h" };
  return c;
};

const withVoltmeter = (): Circuit => {
  const c = loop();
  c.parts.V1 = { type: "voltmeter", x: 2, y: 1, orient: "v" };
  c.wires = { ...c.wires, ...wires(["2,0 2,1 2,2"]) };
  return c;
};

const strom: Goal = {
  k: "measure",
  id: "strom",
  quantity: "current",
  of: "E1",
  unit: "mA",
  label: "Strom",
};
const stromInA: Goal = { ...strom, unit: "A" };
const spannung: Goal = {
  k: "measure",
  id: "spannung",
  quantity: "voltage",
  of: "E1",
  unit: "V",
  label: "Spannung",
};

const run = (goal: Goal, c: Circuit, readings: Record<string, string> = {}) =>
  checkLevel({ goals: [goal] }, c, simulate(c), false, readings);

const measureItem = (r: ReturnType<typeof run>) => r.items.find((i) => i.measure)!;
const ok = (goal: Goal, c: Circuit, id: string, text: string) =>
  measureItem(run(goal, c, { [id]: text })).ok;

/* der Strom der Lampe, wie das Amperemeter ihn in mA anzeigt */
const anzeigeMA = (c: Circuit) => Math.round(Math.abs(simulate(c).cur.A1) * 1000);

describe("Rückblick auf die Messungen", () => {
  it("liest den Wert so ab, wie das Messgerät ihn zeigt", () => {
    const [r] = measuredResults({ goals: [strom] }, withAmmeter());
    expect(r.shown).toMatch(/^\d+ mA$/);
    expect(r.reading).toBe(String(anzeigeMA(withAmmeter())));
  });

  it("gibt den richtigen Eintrag in der Einheit der Aufgabe an", () => {
    const [r] = measuredResults({ goals: [stromInA] }, withAmmeter());
    expect(ok(stromInA, withAmmeter(), "strom", r.reading)).toBe(true);
  });

  it("lässt eine Messung weg, solange kein Messgerät so sitzt", () => {
    expect(measuredResults({ goals: [strom] }, loop())).toEqual([]);
  });
});

describe("Messaufgabe", () => {
  it("bleibt offen, solange kein Amperemeter den Strom der Lampe führt", () => {
    const c = loop();
    const mA = Math.round(Math.abs(simulate(c).cur.E1) * 1000);
    expect(ok(strom, c, "strom", String(mA))).toBe(false);
  });

  it("verlangt genau den Wert, den das Amperemeter in Reihe anzeigt", () => {
    const c = withAmmeter();
    expect(measureItem(run(strom, c)).ok).toBe(false);
    expect(ok(strom, c, "strom", String(anzeigeMA(c)))).toBe(true);
  });

  it("lässt keine Toleranz zu: ein mA daneben ist falsch", () => {
    const c = withAmmeter();
    expect(ok(strom, c, "strom", String(anzeigeMA(c) - 1))).toBe(false);
    expect(ok(strom, c, "strom", String(anzeigeMA(c) + 1))).toBe(false);
  });

  it("vergleicht mit der Anzeige, nicht mit dem ungerundeten Wert", () => {
    const c = withAmmeter();
    const exact = Math.abs(simulate(c).cur.A1) * 1000;
    expect(exact).not.toBe(anzeigeMA(c));
    expect(ok(strom, c, "strom", String(exact))).toBe(false);
  });

  it("rechnet nicht um: verlangt mA, gilt nur die Zahl in mA", () => {
    const c = withAmmeter();
    expect(ok(strom, c, "strom", String(anzeigeMA(c) / 1000))).toBe(false);
  });

  it("verlangt bei einer Aufgabe in A die Zahl in A, mit Dezimalkomma", () => {
    const c = withAmmeter();
    const inA = String(shownA(Math.abs(simulate(c).cur.A1))).replace(".", ",");
    expect(ok(stromInA, c, "strom", inA)).toBe(true);
    expect(ok(stromInA, c, "strom", String(anzeigeMA(c)))).toBe(false);
  });

  it("nimmt nur die Zahl: Vorsatz oder Einheit im Feld sind keine gültige Eingabe", () => {
    const c = withAmmeter();
    const n = anzeigeMA(c);
    for (const text of [`${n} m`, `${n} mA`, `${n}mA`, "", "viel"])
      expect(ok(strom, c, "strom", text), text).toBe(false);
  });

  it("gilt für die Spannung nur bei einem Voltmeter parallel zur Lampe", () => {
    const c = withVoltmeter();
    const shown = shownV(simulate(c).volt.V1);
    expect(shown).toBeGreaterThan(8);
    expect(ok(spannung, c, "spannung", String(shown))).toBe(true);
    expect(ok(spannung, loop(), "spannung", String(shown))).toBe(false);
  });

  it("lässt bei der Spannung kein hundertstel Volt Abweichung zu", () => {
    const c = withVoltmeter();
    const off = (shownV(simulate(c).volt.V1) - 0.01).toFixed(2);
    expect(ok(spannung, c, "spannung", off)).toBe(false);
  });

  it("zählt ein Amperemeter nicht als Spannungsmessung", () => {
    expect(ok(spannung, withAmmeter(), "spannung", "9")).toBe(false);
  });

  it("gibt dem Listeneintrag die Einheit für das Eingabefeld mit", () => {
    expect(measureItem(run(strom, loop())).measure).toEqual({ id: "strom", unit: "mA" });
    expect(measureItem(run(spannung, loop())).measure).toEqual({ id: "spannung", unit: "V" });
  });
});

describe("Ausprobieren", () => {
  const ziel: Goal = { k: "tried", ats: ["S1", "S2"], label: "Probiere beide Taster aus" };
  const level = { goals: [ziel] };
  /* Schließer S1 und Öffner S2 in Ruhe; verdrahtet muss für die Regel nichts sein */
  const taster = (s1Gedrueckt: boolean, s2Gedrueckt: boolean): Circuit => ({
    parts: {
      S1: { type: "button", x: 0, y: 0, orient: "v", closed: s1Gedrueckt },
      S2: { type: "button", x: 2, y: 0, orient: "v", nc: true, closed: !s2Gedrueckt },
    },
    wires: {},
  });
  const erreicht: CheckResult = { items: [{ t: "gebaut", ok: true }], won: true };
  const offen: CheckResult = { items: [{ t: "gebaut", ok: false }], won: false };
  const schritte = (...stellungen: [boolean, boolean][]) =>
    stellungen.reduce<Tried>((t, [a, b]) => advanceTried(t, level, taster(a, b), erreicht), {});

  it("zählt einen Taster erst, wenn er betätigt und wieder losgelassen wurde", () => {
    expect(schritte([true, false])).toEqual({ S1: 1 });
    expect(schritte([true, false], [false, false])).toEqual({ S1: 2 });
  });

  it("rechnet den Öffner als betätigt, wenn er offen ist", () => {
    expect(schritte([false, true], [false, false])).toEqual({ S2: 2 });
  });

  it("ist erfüllt, wenn beide Taster ausprobiert sind – in beliebiger Reihenfolge", () => {
    const t = schritte([false, true], [false, false], [true, false], [false, false]);
    const c = taster(false, false);
    const item = checkLevel(level, c, simulate(c), false, {}, t).items[0];
    expect(item).toMatchObject({ ok: true, tried: true });
  });

  it("bleibt offen, solange ein Taster nur gedrückt, aber nicht losgelassen ist", () => {
    const t = schritte([true, false], [false, false], [false, true]);
    const c = taster(false, true);
    expect(checkLevel(level, c, simulate(c), false, {}, t).items[0].ok).toBe(false);
  });

  it("zählt nichts und beginnt von vorn, solange die übrigen Ziele offen sind", () => {
    const t = schritte([true, false], [false, false]);
    expect(advanceTried(t, level, taster(true, false), offen)).toEqual({});
  });

  it("gibt ohne Änderung dasselbe Objekt zurück", () => {
    const t = schritte([true, false], [false, false]);
    expect(advanceTried(t, level, taster(false, false), erreicht)).toBe(t);
  });
});
