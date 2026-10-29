import { describe, expect, it } from "vitest";
import type { Circuit } from "../domain/types";
import { wires } from "../content/helpers";
import { wireKey } from "./circuit";
import { idleSim, simulate } from "./simulate";

/* Quelle links, Lampe rechts, Leitungen oben und unten – der Stromkreis aus Level 1. */
const loop = (): Circuit => ({
  parts: {
    G1: { type: "battery", x: 0, y: 1, orient: "v" },
    E1: { type: "lamp", x: 4, y: 1, orient: "v" },
  },
  wires: wires(["0,1 0,0 4,0 4,1", "0,1 0,2 4,2 4,1"]),
});

describe("simulate", () => {
  it("lässt die Lampe im geschlossenen Kreis leuchten", () => {
    const sim = simulate(loop());
    expect(sim.closed).toBe(true);
    expect(sim.short).toBe(false);
    expect(sim.lit.has("E1")).toBe(true);
  });

  it("lässt sie im offenen Kreis aus", () => {
    const c = loop();
    delete c.wires[wireKey("2,0", "3,0")];
    const sim = simulate(c);
    expect(sim.closed).toBe(false);
    expect(sim.lit.has("E1")).toBe(false);
  });

  it("erkennt einen Kurzschluss ohne Verbraucher", () => {
    const c: Circuit = {
      parts: { G1: { type: "battery", x: 0, y: 1, orient: "v" } },
      wires: wires(["0,1 0,0 1,0 1,2 0,2 0,1"]),
    };
    expect(simulate(c).short).toBe(true);
  });

  it("trennt den Kreis mit einem offenen Schalter", () => {
    const c = loop();
    c.parts.S1 = { type: "switch", x: 2, y: 0, orient: "h", closed: false };
    expect(simulate(c).lit.has("E1")).toBe(false);
    c.parts.S1.closed = true;
    expect(simulate(c).lit.has("E1")).toBe(true);
  });

  it("verbindet nebeneinanderliegende Leitungen nicht von selbst", () => {
    /* Plus- und Minusleitung laufen in benachbarten Reihen nebeneinander her. Früher
       wären sie dort über jede Nachbarzelle verschmolzen – ein Kurzschluss. Jetzt
       verbindet nur eine gezogene Kante. */
    const c: Circuit = {
      parts: { G1: { type: "battery", x: 0, y: 1, orient: "v" } },
      wires: wires(["0,1 0,0 3,0", "0,1 0,2 1,2 1,1 3,1"]),
    };
    const bridged: Circuit = { ...c, wires: { ...c.wires, ...wires(["2,0 2,1"]) } };
    expect(simulate(c).short).toBe(false);
    expect(simulate(bridged).short).toBe(true);
  });

  it("lässt eine Leitung in eine Bauteilseite ohne Anschluss nicht leiten", () => {
    /* senkrechte Lampe, Leitung kommt von der Seite */
    const c: Circuit = {
      parts: {
        G1: { type: "battery", x: 0, y: 1, orient: "v" },
        E1: { type: "lamp", x: 2, y: 1, orient: "v" },
      },
      wires: wires(["0,1 0,0 2,0 2,1", "0,1 0,2 1,2 1,1 2,1"]),
    };
    const sim = simulate(c);
    expect(sim.lit.has("E1")).toBe(false);
    expect(sim.wires[wireKey("1,1", "2,1")].live).toBe(false);
  });

  it("markiert Knotenpunkte und lose Enden an Leitungsknoten", () => {
    const c = loop();
    c.wires = { ...c.wires, ...wires(["2,0 2,1"]) };
    const sim = simulate(c);
    expect(sim.points["2,0"].deg).toBe(3);
    expect(sim.points["2,1"].deg).toBe(1);
  });

  it("gibt die Flussrichtung bezogen auf den Leitungsschlüssel an", () => {
    /* + liegt oben (N): der Strom läuft oben von links nach rechts, unten zurück */
    const sim = simulate(loop());
    expect(sim.wires[wireKey("1,0", "2,0")].dir).toBe(1);
    expect(sim.wires[wireKey("1,2", "2,2")].dir).toBe(-1);
  });
});

describe("Ruhebild", () => {
  it("zeigt die Knotenpunkte, aber keinen Strom und kein Leuchten", () => {
    const c = loop();
    c.wires = { ...c.wires, ...wires(["2,0 2,1"]) };
    const idle = idleSim(c);
    expect(idle.closed).toBe(false);
    expect(idle.lit.size).toBe(0);
    expect(idle.cur.E1 ?? 0).toBe(0);
    expect(idle.points["2,0"].deg).toBe(3);
  });
});
