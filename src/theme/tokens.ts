/* Farbtokens des Spielfelds. Jedes Token ist eine CSS-Variable (--sk-…) mit dem
   Standardwert als Rückfall. Die SVG-Symbole verwenden nur die var()-Ausdrücke aus
   colors.ts – ein Themenwechsel ist damit reines Setzen von Variablen am Wurzelelement,
   ohne dass etwas neu gezeichnet oder durchgereicht werden muss. */

export const TOKEN_DEFAULTS = {
  bg: "#f3f0e9",
  dot: "#dcd6c8",
  wire: "#3a3a3a",
  live: "#f4a522",
  flow: "#fff4d6",
  battPlus: "#e25555",
  switchOn: "#2f9e8f",
  switchOff: "#b9b3a4",
  lampOn: "#ffc23c",
  lampStroke: "#9a9484",
  wall: "#d8d2c4",
  forbid: "#e25555",
  ink: "#2b2b2b",
  mute: "#b9b3a4",
  hot: "#d63b3b",
  tutorial: "#06b6d4",
} as const;

export type ThemeToken = keyof typeof TOKEN_DEFAULTS;
export const THEME_TOKENS = Object.keys(TOKEN_DEFAULTS) as ThemeToken[];

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
export const cssVar = (t: ThemeToken) => `--sk-${kebab(t)}`;
/** Wert zum Einsetzen in SVG-Attribute und style-Objekte. */
export const tokenRef = (t: ThemeToken) => `var(${cssVar(t)}, ${TOKEN_DEFAULTS[t]})`;
