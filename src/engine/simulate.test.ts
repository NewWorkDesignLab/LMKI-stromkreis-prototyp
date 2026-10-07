import { describe, expect, it } from "vitest";
import type { Grid } from "../domain/types";
import { wire } from "../content/helpers";
import { simulate } from "./simulate";
import { activateAt, eraseAt, placeAt, releaseAt } from "./editing";

/* Batterie links, Lampe rechts, Leitungen oben und unten – der Stromkreis aus Level 1. */
const loop = (): Grid => ({
  "0,1": { type: "battery", orient: "v" },
  "4,1": { type: "lamp", orient: "v" },
  ...wire("0,0 1,0 2,0 3,0 4,0 0,2 1,2 2,2 3,2 4,2"),
});

describe("simulate", () => {
  it("lässt die Lampe im geschlossenen Kreis leuchten", () => {
    const sim = simulate(loop());
    expect(sim.closed).toBe(true);
    expect(sim.short).toBe(false);
    expect(sim.lit.has("4,1")).toBe(true);
  });

  it("lässt sie im offenen Kreis aus", () => {
    const g = loop();
    delete g["2,0"];
    const sim = simulate(g);
    expect(sim.closed).toBe(false);
    expect(sim.lit.has("4,1")).toBe(false);
  });

  it("erkennt einen Kurzschluss ohne Verbraucher", () => {
    const g: Grid = {
      "0,1": { type: "battery", orient: "v" },
      ...wire("0,0 1,0 1,1 1,2 0,2"),
    };
    expect(simulate(g).short).toBe(true);
  });

  it("trennt den Kreis mit einem offenen Schalter", () => {
    const g = loop();
    g["2,0"] = { type: "switch", orient: "h", closed: false };
    expect(simulate(g).lit.has("4,1")).toBe(false);
    g["2,0"] = { type: "switch", orient: "h", closed: true };
    expect(simulate(g).lit.has("4,1")).toBe(true);
  });
});

describe("editing", () => {
  it("schützt vorgegebene Zellen im Level, im Frei bauen nicht", () => {
    const g = loop();
    expect(eraseAt(g, 0, 1, "level")).toBe(g);
    expect(eraseAt(g, 0, 1, "sandbox")["0,1"]).toBeUndefined();
  });

  it("setzt Bauteile nur auf freie Zellen oder gezogene Leitungen", () => {
    const g: Grid = { "1,1": { type: "wire", lock: true } };
    expect(placeAt(g, 1, 1, "lamp", "h")).toBe(g);
    expect(placeAt({}, 1, 1, "lamp", "h")["1,1"]).toMatchObject({
      type: "lamp",
      orient: "h",
      user: true,
    });
  });

  it("schaltet Schalter und lässt Taster zurückfedern", () => {
    const sw: Grid = { "0,0": { type: "switch", orient: "h", closed: false } };
    expect(activateAt(sw, 0, 0, "level").grid["0,0"].closed).toBe(true);

    const btn: Grid = { "0,0": { type: "button", orient: "h", closed: false } };
    const pressed = activateAt(btn, 0, 0, "level");
    expect(pressed.grid["0,0"].closed).toBe(true);
    expect(pressed.pressedKey).toBe("0,0");
    expect(releaseAt(pressed.grid, "0,0")["0,0"].closed).toBe(false);
  });
});
