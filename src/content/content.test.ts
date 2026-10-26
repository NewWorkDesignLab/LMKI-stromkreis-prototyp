import { describe, expect, it } from "vitest";
import type { BuildStep, LevelDef } from "../domain/types";
import { CONCEPTS } from "./concepts";
import { LEVEL_CATALOG } from "./catalog";
import { DEFAULT_CURRICULUM } from "./curriculum";
import { TUTORIALS } from "./tutorials";
import { validateLevel } from "../services/validate";
import { checkLevel, reviewGoals } from "../engine/goals";
import { simulate } from "../engine/simulate";
import { circuitFromCells, fromLegacyLevel } from "./legacy";
import { lockw, wire } from "./helpers";

const builds = (l: LevelDef) => l.steps.filter((s): s is BuildStep => s.kind === "build");
const level = (id: string) => LEVEL_CATALOG.find((l) => l.id === id);
const build = (id: string) => builds(level(id))[0];

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
      for (const st of l.steps)
        for (const c of st.concepts ?? [])
          expect(concepts.has(c), `${l.id}/${st.id}: ${c}`).toBe(true);
      for (const b of builds(l)) if (b.tutorial) expect(TUTORIALS[b.tutorial], l.id).toBeDefined();
    }
  });

  it("verweist in Einführungen nur auf Bauteile und Leitungen des aufrufenden Bauschritts", () => {
    for (const l of LEVEL_CATALOG)
      for (const b of builds(l)) {
        const t = b.tutorial && TUTORIALS[b.tutorial];
        if (!t) continue;
        if (t.kind === "tapSwitch")
          for (const id of [t.switchId, t.lampId])
            expect(b.circuit.parts[id], `${l.id}: ${id}`).toBeDefined();
        else
          for (const s of t.steps)
            for (const k of s.need) {
              const [p, q] = k.split("|").map((pt) => pt.split(",").map(Number));
              for (const [x, y] of [p, q]) expect(x < b.W && y < b.H, `${l.id}: ${k}`).toBe(true);
            }
      }
  });

  it("lässt keinen Bauschritt schon im Startzustand gelöst sein", () => {
    for (const l of LEVEL_CATALOG)
      for (const b of builds(l))
        expect(checkLevel(b, b.circuit, simulate(b.circuit)).won, l.id).toBe(false);
  });

  it("erreicht mit jeder Musterlösung die Ziele ihres Bauschritts", () => {
    for (const l of LEVEL_CATALOG)
      for (const b of builds(l))
        /* Messaufgaben brauchen den abgelesenen Wert; die Rückschau liest ihn von der Anzeige ab */
        if (b.solution) {
          const items = reviewGoals(b, b.solution);
          expect(items.length > 0 && items.every((i) => i.ok), `${l.id}/${b.id}`).toBe(true);
        }
  });
});

describe("Altformat", () => {
  it("übernimmt die alte Nachbarschaftsregel genau einmal, beim Laden", () => {
    /* „Knotenpunkt oder Kreuzung?“ beginnt absichtlich kurzgeschlossen – das muss
       nach der Übersetzung genauso sein. */
    expect(simulate(build("knotenpunkt-oder-kreuzung").circuit).short).toBe(true);
  });

  it("vergibt IDs in Lesereihenfolge und übersetzt Verweise in Zielen", () => {
    const b = build("reihenschaltung-und");
    expect(b.circuit.parts.S1).toMatchObject({ x: 2, y: 0 });
    expect(b.circuit.parts.S2).toMatchObject({ x: 4, y: 0 });
    expect(b.goals[0]).toMatchObject({ at: "E1", inputs: ["S1", "S2"] });
  });

  it("macht aus einem Level die Schritte Bauen und Merksatz, mit vorangestellten davor", () => {
    expect(level("der-schalter").steps.map((s) => s.kind)).toEqual(["build", "summary"]);
    expect(level("ohmsches-gesetz").steps.map((s) => s.kind)).toEqual(["quiz", "build", "summary"]);
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
    expect(() =>
      fromLegacyLevel({
        id: "kaputt",
        name: "Kaputt",
        W: 3,
        H: 3,
        palette: ["wire"],
        task: "…",
        lesson: "…",
        cells: { "0,0": { type: "lamp", orient: "h" } },
        goals: [{ k: "on", at: "5,5" }],
      }),
    ).toThrow();
  });
});
