import { describe, expect, it } from "vitest";
import { createApi } from "./index";
import type { ApiEvent } from "./types";
import { createRuntime } from "../app/runtime";

const setup = () => {
  const rt = createRuntime();
  return { rt, api: createApi(rt) };
};

describe("API", () => {
  it("startet im ersten Level des Lehrplans", () => {
    const { api } = setup();
    expect(api.getSnapshot().currentLevelId).toBe("schliesse-den-stromkreis");
    expect(api.getSnapshot().order).toHaveLength(26);
  });

  it("wechselt das Level und weist Unbekanntes ab", () => {
    const { api } = setup();
    expect(api.dispatch({ type: "go_to_level", levelId: "der-schalter" })).toEqual({ ok: true });
    expect(api.getSnapshot().currentLevelId).toBe("der-schalter");
    expect(api.dispatch({ type: "go_to_level", levelId: "gibt-es-nicht" }).ok).toBe(false);
  });

  it("setzt die Reihenfolge nur mit bekannten IDs", () => {
    const { api } = setup();
    const ok = api.dispatch({ type: "set_level_order", levelIds: ["der-schalter", "der-oeffner"] });
    expect(ok.ok).toBe(true);
    expect(api.getSnapshot().order).toEqual(["der-schalter", "der-oeffner"]);
    expect(api.dispatch({ type: "set_level_order", levelIds: ["nope"] }).ok).toBe(false);
  });

  it("lässt den Standard-Sequenzierer der Reihenfolge folgen", () => {
    const { rt, api } = setup();
    api.dispatch({ type: "set_level_order", levelIds: ["der-oeffner", "der-schalter"] });
    api.dispatch({ type: "go_to_level", levelId: "der-oeffner" });
    expect(rt.nextLevelId()).toBe("der-schalter");
    api.dispatch({ type: "go_to_level", levelId: "der-schalter" });
    expect(rt.nextLevelId()).toBeNull();
  });

  it("lehnt ungültige Level ab und nimmt gültige an", () => {
    const { api } = setup();
    const bad = api.dispatch({ type: "register_level", level: { id: "Kaputt!" } as never });
    expect(bad.ok).toBe(false);
    const level = {
      id: "mein-level",
      name: "Mein Level",
      steps: [
        {
          kind: "build",
          id: "bauen",
          W: 5,
          H: 3,
          palette: ["wire", "erase"],
          task: "Aufgabe",
          circuit: {
            parts: {
              G1: { type: "battery", x: 0, y: 1, orient: "v" },
              E1: { type: "lamp", x: 4, y: 1, orient: "v" },
            },
            wires: {},
          },
        },
        { kind: "summary", id: "merksatz", lesson: "Merksatz" },
      ],
    };
    expect(api.dispatch({ type: "register_level", level: level as never }).ok).toBe(true);
    expect(api.getLevel("mein-level")?.name).toBe("Mein Level");
  });

  it("überschreibt Texte je Schritt, ohne das Brett zu ersetzen", () => {
    const { rt, api } = setup();
    const rev = rt.content.boardRevision("der-schalter");
    const ok = api.dispatch({
      type: "patch_level",
      levelId: "der-schalter",
      patch: { steps: { bauen: { task: "Neue Aufgabe" }, merksatz: { lesson: "Neu" } } },
    });
    expect(ok).toEqual({ ok: true });
    const steps = api.getLevel("der-schalter")?.steps;
    expect(steps[0]).toMatchObject({ kind: "build", task: "Neue Aufgabe" });
    expect(steps[1]).toMatchObject({ kind: "summary", lesson: "Neu" });
    expect(rt.content.boardRevision("der-schalter")).toBe(rev);
  });

  it("lehnt Texte für unbekannte Schritte oder fremde Felder ab", () => {
    const { api } = setup();
    const patch = (p: object) =>
      api.dispatch({ type: "patch_level", levelId: "der-schalter", patch: p as never });
    expect(patch({ steps: { gibtsnicht: { task: "x" } } }).ok).toBe(false);
    expect(patch({ steps: { merksatz: { task: "x" } } }).ok).toBe(false);
  });

  it("meldet Lernereignisse und Zustandsänderungen", () => {
    const { rt, api } = setup();
    const seen: ApiEvent[] = [];
    api.subscribe((e) => seen.push(e));
    api.dispatch({ type: "go_to_level", levelId: "der-schalter" });
    rt.reportSolved("der-schalter");
    const types = seen.map((e) => e.type);
    expect(types).toContain("level_started");
    expect(types).toContain("level_solved");
    expect(types).toContain("state_changed");
    expect(api.getSnapshot().solved).toContain("der-schalter");
    expect(api.getProfile().concepts["schalter"].solves).toBe(1);
  });

  it("wertet Antworten bei den Konzepten ihres Schritts aus", () => {
    const { rt, api } = setup();
    api.dispatch({ type: "go_to_level", levelId: "ohmsches-gesetz" });
    rt.reportAnswer("ohmsches-gesetz", "rechnen", { k: "number", text: "300" }, false);
    rt.reportAnswer("ohmsches-gesetz", "rechnen", { k: "number", text: "220" }, true);
    expect(api.getProfile().concepts["ohmsches-gesetz"]).toMatchObject({ answers: 2, wrong: 1 });
    /* „widerstand“ übt das Level, aber nicht diese Frage */
    expect(api.getProfile().concepts["widerstand"].answers).toBe(0);
    expect(api.getLevelStats("ohmsches-gesetz")).toMatchObject({ answers: 2, wrongAnswers: 1 });
  });

  it("wechselt das Thema", () => {
    const { api } = setup();
    expect(api.dispatch({ type: "set_theme", themeId: "kontrast" })).toEqual({ ok: true });
    expect(api.dispatch({ type: "set_theme", themeId: "gibtsnicht" }).ok).toBe(false);
  });
});
