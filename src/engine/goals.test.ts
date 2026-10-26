import { describe, expect, it } from "vitest";
import type { Circuit, Goal } from "../domain/types";
import { wires } from "../content/helpers";
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

const strom: Goal = { k: "measure", id: "strom", quantity: "current", of: "E1", label: "Strom" };
const spannung: Goal = {
  k: "measure",
  id: "spannung",
  quantity: "voltage",
  of: "E1",
  label: "Spannung",
};

const run = (goal: Goal, c: Circuit, readings: Record<string, string> = {}) =>
  checkLevel({ goals: [goal] }, c, simulate(c), false, readings);

const measureItem = (r: ReturnType<typeof run>) => r.items.find((i) => i.measure)!;

describe("Rückblick auf die Ziele", () => {
  it("hakt alle Ziele eines gelösten Aufbaus ab und nennt den gemessenen Wert", () => {
    const items = reviewGoals({ goals: [strom] }, withAmmeter());
    expect(items.every((i) => i.ok)).toBe(true);
    expect(items.find((i) => i.measure)!.t).toMatch(/^Strom: \d+ mA$/);
  });

  it("lässt ein Messziel offen, solange kein Messgerät so sitzt", () => {
    const items = reviewGoals({ goals: [strom] }, loop());
    expect(items.find((i) => i.measure)!.ok).toBe(false);
  });
});

describe("Messaufgabe", () => {
  it("bleibt offen, solange kein Amperemeter den Strom der Lampe führt", () => {
    const c = loop();
    const shown = Math.abs(simulate(c).cur.E1) * 1000;
    expect(measureItem(run(strom, c, { strom: `${shown} mA` })).ok).toBe(false);
  });

  it("verlangt den Wert, den das Amperemeter in Reihe wirklich zeigt", () => {
    const c = withAmmeter();
    const shown = Math.abs(simulate(c).cur.A1);
    expect(measureItem(run(strom, c)).ok).toBe(false);
    expect(measureItem(run(strom, c, { strom: "50 mA" })).ok).toBe(false);
    expect(measureItem(run(strom, c, { strom: `${shown * 1000} mA` })).ok).toBe(true);
  });

  it("nimmt die Zahl in der Grundeinheit und mit Dezimalkomma", () => {
    const c = withAmmeter();
    const shown = Math.abs(simulate(c).cur.A1);
    expect(measureItem(run(strom, c, { strom: String(shown).replace(".", ",") })).ok).toBe(true);
  });

  it("lehnt eine Einheit der falschen Größe ab", () => {
    const c = withAmmeter();
    const shown = Math.abs(simulate(c).cur.A1);
    expect(measureItem(run(strom, c, { strom: `${shown} V` })).ok).toBe(false);
  });

  it("gilt für die Spannung nur bei einem Voltmeter parallel zur Lampe", () => {
    const c = withVoltmeter();
    const shown = Math.abs(simulate(c).volt.V1);
    expect(shown).toBeGreaterThan(8);
    expect(measureItem(run(spannung, c, { spannung: `${shown} V` })).ok).toBe(true);
    expect(measureItem(run(spannung, loop(), { spannung: `${shown} V` })).ok).toBe(false);
  });

  it("zählt ein Amperemeter nicht als Spannungsmessung", () => {
    const c = withAmmeter();
    expect(measureItem(run(spannung, c, { spannung: "9 V" })).ok).toBe(false);
  });

  it("gibt dem Listeneintrag Größe und Einheit für das Eingabefeld mit", () => {
    expect(measureItem(run(strom, loop())).measure).toEqual({ id: "strom", unit: "A" });
    expect(measureItem(run(spannung, loop())).measure).toEqual({ id: "spannung", unit: "V" });
  });
});
