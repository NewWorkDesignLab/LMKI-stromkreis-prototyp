import type { SimResult } from "../domain/types";

/* Leeres Ergebnis für Symbole außerhalb des Bretts (Werkzeugkacheln, Legende). */
export const EMPTY_SIM: Pick<
  SimResult,
  "glow" | "liveNode" | "lit" | "bright" | "overload" | "tripped" | "short"
> = {
  glow: new Set(),
  liveNode: new Set(),
  lit: new Set(),
  bright: {},
  overload: new Set(),
  tripped: new Set(),
  short: false,
};
