import { describe, expect, it } from "vitest";
import type { CheckResult, Circuit, Goal, PartId, Tried } from "../domain/types";
import { wires } from "../content/helpers";
import { shownA, shownV } from "./format";
import {
  advanceOperated,
  checkLevel,
  keepTried,
  measuredResults,
  startOperated,
  tryCue,
  tryPress,
  tryRelease,
} from "./goals";
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
  checkLevel({ goals: [goal] }, c, simulate(c), { readings });

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

describe("Ausprobieren in der Funktionsansicht", () => {
  const ziel: Goal = { k: "tried", ats: ["S1", "S2"], label: "Probiere beide Taster aus" };
  const level = { goals: [ziel] };
  const leer: Circuit = { parts: {}, wires: {} };
  const ergebnis = (t: Tried) => checkLevel(level, leer, simulate(leer), { tried: t }).items[0];
  /* Drücken und Loslassen in der Ansicht, so wie die Handler es melden */
  const tasten = (...folge: [PartId, "drück" | "los"][]) =>
    folge.reduce<Tried>((t, [id, was]) => (was === "drück" ? tryPress : tryRelease)(t, id), {});

  it("zählt einen Taster erst, wenn er gedrückt und wieder losgelassen wurde", () => {
    expect(tasten(["S1", "drück"])).toEqual({ S1: 1 });
    expect(tasten(["S1", "drück"], ["S1", "los"])).toEqual({ S1: 2 });
    expect(tasten(["S1", "los"])).toEqual({});
  });

  it("ist erfüllt, wenn beide Taster ausprobiert sind – in beliebiger Reihenfolge", () => {
    const t = tasten(["S2", "drück"], ["S2", "los"], ["S1", "drück"], ["S1", "los"]);
    expect(ergebnis(t)).toMatchObject({ ok: true, tried: true });
  });

  it("bleibt offen, solange ein Taster nur gedrückt, aber nicht losgelassen ist", () => {
    expect(ergebnis(tasten(["S1", "drück"], ["S1", "los"], ["S2", "drück"])).ok).toBe(false);
  });

  it("beginnt von vorn, solange die übrigen Ziele offen sind", () => {
    const t = tasten(["S1", "drück"], ["S1", "los"]);
    const offen: CheckResult = { items: [{ t: "gebaut", ok: false }], won: false };
    const erreicht: CheckResult = { items: [{ t: "gebaut", ok: true }], won: true };
    expect(keepTried(t, offen)).toEqual({});
    expect(keepTried(t, erreicht)).toBe(t);
  });

  it("verlangt zu Beginn bei jedem Taster das Drücken", () => {
    expect(tryCue({}, "S1")).toBe("press");
    expect(tryCue({}, "S2")).toBe("press");
  });

  it("lässt den gedrückten Taster loslassen und den anderen so lange warten", () => {
    const t = tasten(["S1", "drück"]);
    expect(tryCue(t, "S1")).toBe("release");
    expect(tryCue(t, "S2")).toBe("wait");
  });

  it("ist nach dem Loslassen erledigt und gibt den anderen Taster frei", () => {
    const t = tasten(["S1", "drück"], ["S1", "los"]);
    expect(tryCue(t, "S1")).toBe("done");
    expect(tryCue(t, "S2")).toBe("press");
  });
});

describe("Logik-Ziel, das betätigt sein will", () => {
  /* Zwei Zweige wie in „Der Öffner“: Schließer S1 vor Lampe E1, Öffner S2 vor Lampe E2 */
  const zweig1 = ["0,1 0,0 2,0 2,1", "2,1 2,2", "2,2 2,3 0,3 0,2 0,1"];
  const zweig2 = ["2,0 4,0 4,1", "4,1 4,2", "4,2 4,3 2,3"];
  const kreis = (leitungen: string[], s1 = false, s2 = false): Circuit => ({
    parts: {
      G1: { type: "battery", x: 0, y: 1, orient: "v" },
      S1: { type: "button", x: 2, y: 1, orient: "v", closed: s1 },
      E1: { type: "lamp", x: 2, y: 2, orient: "v" },
      S2: { type: "button", x: 4, y: 1, orient: "v", nc: true, closed: !s2 },
      E2: { type: "lamp", x: 4, y: 2, orient: "v" },
    },
    wires: wires(leitungen),
  });
  const ziele: Goal[] = [
    { k: "logic", at: "E1", expr: "id", inputs: ["S1"], operated: true, label: "Schließer" },
    { k: "logic", at: "E2", expr: "not", inputs: ["S2"], operated: true, label: "Öffner" },
  ];
  const level = { goals: ziele };
  /* eine Folge von Schaltungen, wie sie beim Bauen und Drücken entsteht */
  const ablauf = (...folge: Circuit[]) =>
    folge.reduce((o, c) => advanceOperated(o, level, c), startOperated(folge[0]));
  const erfuellt = (c: Circuit, ids: ReadonlySet<PartId>) =>
    checkLevel(level, c, simulate(c), { operated: ids }).items.map((i) => i.ok);

  it("bleibt offen, solange nur verdrahtet, aber nicht betätigt wurde", () => {
    const fertig = kreis([...zweig1, ...zweig2]);
    expect(erfuellt(fertig, ablauf(fertig).ids)).toEqual([false, false]);
  });

  it("ist erfüllt, sobald der Taster am verdrahteten Zweig betätigt wurde", () => {
    const o = ablauf(kreis(zweig1), kreis(zweig1, true), kreis(zweig1));
    expect(erfuellt(kreis(zweig1), o.ids)[0]).toBe(true);
  });

  it("behält das Betätigen, wenn danach der andere Zweig verdrahtet wird", () => {
    const fertig = kreis([...zweig1, ...zweig2]);
    const o = ablauf(kreis(zweig1), kreis(zweig1, true), kreis(zweig1), fertig);
    expect(erfuellt(fertig, o.ids)).toEqual([true, false]);
  });

  it("zählt kein Drücken an einem Zweig, der noch nicht verdrahtet ist", () => {
    const halb = ["0,1 0,0 2,0 2,1", "2,1 2,2"];
    const o = ablauf(kreis(halb), kreis(halb, true), kreis(halb), kreis(zweig1));
    expect(o.ids.has("S1")).toBe(false);
  });

  it("vergisst das Betätigen, sobald die Verdrahtung seines Ziels nicht mehr stimmt", () => {
    const getrennt = kreis(zweig1.filter((w) => w !== "2,1 2,2"));
    const o = ablauf(kreis(zweig1), kreis(zweig1, true), kreis(zweig1), getrennt);
    expect(o.ids.has("S1")).toBe(false);
  });

  it("zählt einen schon geschlossenen Schalter erst nach erneutem Schalten", () => {
    const mitSchalter = (zu: boolean): Circuit => {
      const c = kreis(zweig1);
      return { ...c, parts: { ...c.parts, S1: { ...c.parts.S1, type: "switch", closed: zu } } };
    };
    expect(ablauf(mitSchalter(true), mitSchalter(true)).ids.size).toBe(0);
    const umgelegt = ablauf(mitSchalter(true), mitSchalter(false), mitSchalter(true));
    expect([...umgelegt.ids]).toEqual(["S1"]);
  });
});
