import { describe, expect, it } from "vitest";
import type { Circuit, Goal } from "../domain/types";
import { wires } from "../content/helpers";
import { shownA, shownV } from "./format";
import { checkLevel, reviewGoals } from "./goals";
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

describe("Rückblick auf die Ziele", () => {
  it("hakt alle Ziele eines gelösten Aufbaus ab und nennt den gemessenen Wert", () => {
    const items = reviewGoals({ goals: [strom] }, withAmmeter());
    expect(items.every((i) => i.ok)).toBe(true);
    expect(items.find((i) => i.measure)!.t).toMatch(/^Strom: d+ mA$/);
  });

  it("hakt auch ein Messziel in A ab", () => {
    expect(reviewGoals({ goals: [stromInA] }, withAmmeter()).every((i) => i.ok)).toBe(true);
  });

  it("lässt ein Messziel offen, solange kein Messgerät so sitzt", () => {
    const items = reviewGoals({ goals: [strom] }, loop());
    expect(items.find((i) => i.measure)!.ok).toBe(false);
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
