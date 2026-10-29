import type { GlyphSim } from "./symbols";

/* Leeres Ergebnis für Symbole außerhalb des Bretts (Werkzeugkacheln, Legende). */
export const EMPTY_SIM: GlyphSim = {
  glow: new Set(),
  crossLive: {},
  lit: new Set(),
  bright: {},
  overload: new Set(),
  tripped: new Set(),
  short: false,
};
