import { describe, expect, it } from "vitest";
import { CONCEPTS } from "./concepts";
import { LEVEL_CATALOG } from "./catalog";
import { DEFAULT_CURRICULUM } from "./curriculum";
import { TUTORIALS } from "./tutorials";
import { validateLevel } from "../services/validate";

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
});
