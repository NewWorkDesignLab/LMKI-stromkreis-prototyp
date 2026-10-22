import type { LevelDef, ToolId } from "../domain/types";

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

/* Spielwiese: kein Lehrplan-Level, sondern ein freies Feld mit allen Bauteilen. */
export const SANDBOX: LevelDef = {
  id: "sandbox",
  name: "Frei bauen",
  palette: SANDBOX_PALETTE,
  task: "",
  lesson: "",
  labelSwitches: true,
  W: 9,
  H: 6,
  showValues: true,
  circuit: {
    parts: {
      G1: { type: "battery", x: 1, y: 2, orient: "v" },
      E1: { type: "lamp", x: 7, y: 2, orient: "v" },
    },
    wires: {},
  },
};
