import { describe, expect, it } from "vitest";
import type { Part } from "../domain/types";
import { ratingLines } from "./format";

const part = (p: Partial<Part> & Pick<Part, "type">): Part => ({ x: 0, y: 0, ...p });

describe("Kennwerte", () => {
  it("schreibt Nennwerte wie auf dem Sockel, ohne Nachkommastellen", () => {
    expect(ratingLines(part({ type: "battery" }), false)).toEqual(["9 V"]);
    expect(ratingLines(part({ type: "lamp" }), false)).toEqual(["9 V / 100 mA"]);
    expect(ratingLines(part({ type: "led" }), false)).toEqual(["2 V / 15 mA"]);
  });

  it("nimmt die Werte des Bauteils vor den Vorgaben", () => {
    const lamp18 = part({ type: "lamp", r: 360, un: 18, in: 0.05 });
    expect(ratingLines(lamp18, false)).toEqual(["18 V / 50 mA"]);
  });

  it("ergänzt in Rechenleveln den Bauteilwiderstand", () => {
    expect(ratingLines(part({ type: "lamp" }), true)).toEqual(["9 V / 100 mA", "90 Ω"]);
    expect(ratingLines(part({ type: "motor" }), true)).toEqual(["60 Ω"]);
    expect(ratingLines(part({ type: "motor" }), false)).toEqual([]);
  });
});
