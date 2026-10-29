import type { BuildStep, ToolId } from "../domain/types";

const SANDBOX_PALETTE: ToolId[] = [
  "wire",
  "cross",
  "battery",
  "lamp",
  "led",
  "resistor",
  "switch",
  "opener",
  "button",
  "spdt",
  "motor",
  "buzzer",
  "fuse",
  "ammeter",
  "voltmeter",
  "erase",
];

/* Spielwiese: kein Lehrplan-Level, sondern ein freies Feld mit allen Bauteilen –
   ein einzelner Bauschritt ohne Ziele. */
export const SANDBOX: BuildStep = {
  kind: "build",
  id: "sandbox",
  palette: SANDBOX_PALETTE,
  task: "",
  labelSwitches: true,
  /* Groß genug für mehrere Kreise nebeneinander; das Brett lässt sich zoomen. */
  W: 14,
  H: 9,
  ratings: "nominal",
  circuit: {
    parts: {
      G1: { type: "battery", x: 2, y: 4, orient: "v" },
      E1: { type: "lamp", x: 8, y: 4, orient: "v" },
    },
    wires: {},
  },
};
