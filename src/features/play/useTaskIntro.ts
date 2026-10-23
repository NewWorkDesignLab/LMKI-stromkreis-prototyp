import { useEffect, useState, type CSSProperties } from "react";

/* Wie lange die Aufgabe beim Betreten eines Bauschritts hervorgehoben bleibt: genug, um
   zwei, drei Zeilen in Ruhe zu lesen und dabei schon aufs Brett zu schauen. Jede Eingabe
   beendet es sofort. */
const INTRO_MS = 7000;
/* Leicht herausgehoben – sie bleibt an ihrem Platz und verdeckt nichts vom Brett: manche
   Aufgaben versteht man erst mit Blick auf die Schaltung. */
const INTRO_STYLE: CSSProperties = {
  transform: "scale(1.015)",
  position: "relative",
  zIndex: 10,
};
const SETTLE = "transform 450ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 450ms";

/* Aufgabe beim Start hervorheben (Einstellung): Beim ersten Betreten eines Bauschritts
   steht nur der Aufgabentext leicht herausgehoben da, die Ziele noch nicht – erst lesen,
   was zu tun ist. Danach setzt sich die Leiste, und die Ziele erscheinen nacheinander
   (`goalsEnter`). Nur einmal je Schritt: die Komponente bleibt beim Zurückblättern
   eingehängt und startet nicht neu. Blockiert nie – Klick oder Taste beenden es sofort. */
export function useTaskIntro(enabled: boolean, active: boolean) {
  const [intro, setIntro] = useState(enabled && active);
  /* Ziele nur dann einzeln einblenden, wenn es eine Einblendung gab – sonst stehen sie
     einfach da. */
  const [goalsEnter] = useState(intro);

  useEffect(() => {
    if (!intro) return;
    const done = () => setIntro(false);
    const timer = window.setTimeout(done, INTRO_MS);
    window.addEventListener("pointerdown", done, true);
    window.addEventListener("keydown", done, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", done, true);
      window.removeEventListener("keydown", done, true);
    };
  }, [intro]);

  /* Ein verborgener Schritt (Zurückblättern mitten in der Einblendung) setzt sich sofort. */
  if (intro && !active) setIntro(false);

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const taskStyle: CSSProperties = intro ? INTRO_STYLE : reduced ? {} : { transition: SETTLE };

  return { intro, goalsEnter, taskStyle };
}
