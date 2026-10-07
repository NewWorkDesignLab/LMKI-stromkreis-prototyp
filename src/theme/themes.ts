import { cssVar, THEME_TOKENS, type ThemeToken } from "./tokens";

/** Ein Thema überschreibt beliebig viele Tokens; der Rest bleibt Standard. */
export interface ThemeDef {
  id: string;
  name: string;
  tokens: Partial<Record<ThemeToken, string>>;
}

export const DEFAULT_THEME: ThemeDef = { id: "standard", name: "Standard", tokens: {} };

/* Beispiel für ein zweites Thema; zeigt, dass der Mechanismus trägt. */
export const THEMES: ThemeDef[] = [
  DEFAULT_THEME,
  {
    id: "kontrast",
    name: "Hoher Kontrast",
    tokens: {
      bg: "#ffffff",
      dot: "#c8c8c8",
      wire: "#000000",
      ink: "#000000",
      live: "#d97700",
      mute: "#6b6b6b",
    },
  },
];

/** Setzt ein Thema am Wurzelelement. Nicht genannte Tokens fallen auf den Standard zurück. */
export function applyTheme(el: HTMLElement, theme: ThemeDef) {
  for (const t of THEME_TOKENS) {
    const v = theme.tokens[t];
    if (v) el.style.setProperty(cssVar(t), v);
    else el.style.removeProperty(cssVar(t));
  }
  el.dataset.theme = theme.id;
}
