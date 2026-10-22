import { describe, expect, it } from "vitest";
import { CONCEPTS } from "./concepts";
import { LEVEL_CATALOG } from "./catalog";
import { DEFAULT_CURRICULUM } from "./curriculum";
import { TUTORIALS } from "./tutorials";
import { validateLevel } from "../services/validate";
import { checkLevel } from "../engine/goals";
import { simulate } from "../engine/simulate";
import { circuitFromCells, fromLegacyLevel } from "./legacy";
import { lockw, wire } from "./helpers";

/* Schützt die Inhalte vor Tippfehlern: wer Level hinzufügt oder umstellt, bekommt hier
   sofort Bescheid, statt erst beim Durchspielen. */
describe("Inhalte", () => {
  it("hat eindeutige Level-IDs", () => {
    const ids = LEVEL_CATALOG.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("besteht die Level-Prüfung", () => {
    for (const l of LEVEL_CATALOG) expect(validateLevel(l), l.id).toEqual({ ok: true, errors: [] });
  });

  it("verweist im Lehrplan nur auf vorhandene Level, jedes höchstens einmal", () => {
    const ids = new Set(LEVEL_CATALOG.map((l) => l.id));
    const used = DEFAULT_CURRICULUM.chapters.flatMap((c) => c.levelIds);
    for (const id of used) expect(ids.has(id), id).toBe(true);
    expect(new Set(used).size).toBe(used.length);
  });

  it("verwendet nur bekannte Konzepte und Einführungen", () => {
    const concepts = new Set(CONCEPTS.map((c) => c.id));
    for (const c of CONCEPTS)
      for (const r of c.requires ?? []) expect(concepts.has(r), r).toBe(true);
    for (const l of LEVEL_CATALOG) {
      for (const c of l.concepts ?? []) expect(concepts.has(c), `${l.id}: ${c}`).toBe(true);
      if (l.tutorial) expect(TUTORIALS[l.tutorial], l.id).toBeDefined();
    }
  });

  it("verweist in Einführungen nur auf Bauteile und Leitungen des aufrufenden Levels", () => {
    for (const l of LEVEL_CATALOG) {
      const t = l.tutorial && TUTORIALS[l.tutorial];
      if (!t) continue;
      if (t.kind === "tapSwitch")
        for (const id of [t.switchId, t.lampId])
          expect(l.circuit.parts[id], `${l.id}: ${id}`).toBeDefined();
      else
        for (const s of t.steps)
          for (const k of s.need) {
            const [a, b] = k.split("|").map((p) => p.split(",").map(Number));
            for (const [x, y] of [a, b]) expect(x < l.W && y < l.H, `${l.id}: ${k}`).toBe(true);
          }
    }
  });
});

describe("Altformat", () => {
  it("übernimmt die alte Nachbarschaftsregel genau einmal, beim Laden", () => {
    /* „Knotenpunkt oder Kreuzung?“ beginnt absichtlich kurzgeschlossen – das muss
       nach der Übersetzung genauso sein. */
    const knot = LEVEL_CATALOG.find((l) => l.id === "knotenpunkt-oder-kreuzung");
    expect(simulate(knot.circuit).short).toBe(true);
  });

  it("vergibt IDs in Lesereihenfolge und übersetzt Verweise in Zielen", () => {
    const l = LEVEL_CATALOG.find((x) => x.id === "reihenschaltung-und");
    expect(l.circuit.parts.S1).toMatchObject({ x: 2, y: 0 });
    expect(l.circuit.parts.S2).toMatchObject({ x: 4, y: 0 });
    expect(l.goals[0]).toMatchObject({ at: "E1", inputs: ["S1", "S2"] });
  });

  it("macht Leitungen nur dort fest, wo keine löschbare Zelle beteiligt war", () => {
    const { circuit } = circuitFromCells({
      "0,0": { type: "battery", orient: "h" },
      ...lockw("1,0"),
      ...wire("2,0"),
    });
    expect(circuit.wires["0,0|1,0"]).toEqual({ lock: true });
    expect(circuit.wires["1,0|2,0"]).toEqual({});
  });

  it("wirft bei Verweisen auf Zellen ohne Bauteil", () => {
    const l = LEVEL_CATALOG.find((x) => x.id === "der-schalter");
    expect(() =>
      fromLegacyLevel({
        ...l,
        cells: { "0,0": { type: "lamp", orient: "h" } },
        goals: [{ k: "on", at: "5,5" }],
      }),
    ).toThrow();
  });

  it("lässt kein Level schon im Startzustand gelöst sein", () => {
    for (const l of LEVEL_CATALOG) {
      const r = checkLevel(l, l.circuit, simulate(l.circuit));
      expect(r.won, l.id).toBe(false);
    }
  });
});
