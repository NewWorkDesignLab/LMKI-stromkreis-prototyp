import type { Part, PartId, SimResult } from "../../domain/types";
import { batteryEl } from "./battery";
import { buttonEl } from "./button";
import { crossEl } from "./cross";
import { fuseEl } from "./fuse";
import { lampEl } from "./lamp";
import { ledEl } from "./led";
import { resistorEl } from "./resistor";
import { buzzerEl, meterEl, motorEl } from "./round";
import { spdtEl } from "./spdt";
import { switchEl } from "./switch";

export * from "./icons";

export type GlyphSim = Pick<
  SimResult,
  "glow" | "crossLive" | "lit" | "bright" | "overload" | "tripped" | "short"
>;

/* zeichnet ein Bauteil an seinem Punkt; wird vom Brett, den Werkzeugkacheln und der
   Symbol-Legende benutzt */
export function partGlyph(k: PartId, c: Part, sim: GlyphSim) {
  const { x, y } = c;
  const glow = sim.glow.has(k);
  switch (c.type) {
    case "cross":
      return crossEl(x, y, !!sim.crossLive[k]?.h, !!sim.crossLive[k]?.v);
    case "battery":
      return batteryEl(x, y, c, glow || sim.short, sim.short);
    case "switch":
      return switchEl(x, y, c, glow);
    case "button":
      return buttonEl(x, y, c, glow);
    case "spdt":
      return spdtEl(x, y, c, glow);
    case "lamp":
      return lampEl(x, y, c, sim.lit.has(k), sim.bright[k], sim.overload.has(k));
    case "led":
      return ledEl(x, y, c, sim.lit.has(k), sim.overload.has(k));
    case "resistor":
      return resistorEl(x, y, c, glow);
    case "fuse":
      return fuseEl(x, y, c, glow, sim.tripped.has(k));
    case "motor":
      return motorEl(x, y, c, glow, sim.lit.has(k));
    case "buzzer":
      return buzzerEl(x, y, c, glow, sim.lit.has(k));
    case "ammeter":
    case "voltmeter":
      return meterEl(x, y, c, glow, c.type);
    default:
      return null;
  }
}
