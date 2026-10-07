import type { Cell, CellKey, SimResult } from "../../domain/types";
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
import { wallEl } from "./wall";

export * from "./icons";

/* zeichnet eine Zelle; wird vom Brett und von der Symbol-Legende benutzt */
export function cellGlyph(
  k: CellKey,
  c: Cell,
  sim: Pick<SimResult, "glow" | "liveNode" | "lit" | "bright" | "overload" | "tripped" | "short">,
) {
  const [x, y] = k.split(",").map(Number);
  const glow = sim.glow.has(k);
  switch (c.type) {
    case "wall":
      return wallEl(x, y);
    case "cross":
      return crossEl(x, y, sim.liveNode.has(`ch:${k}`), sim.liveNode.has(`cv:${k}`));
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
