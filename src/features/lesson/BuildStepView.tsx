import type { BuildStep } from "../../domain/types";
import { summaryAfter } from "../../engine/lesson";
import { PlayArea } from "../play/PlayArea";
import type { StepViewProps } from "./stepViews";

/* Bauschritt: das Spielfeld. Erreicht die Schaltung die Ziele, ist der Schritt erledigt;
   weiter geht es erst auf Knopfdruck, damit man das Ergebnis noch ansehen kann. Die
   lösende Schaltung geht mit in den Ablauf – Merksatz und spätere Fragen zeigen sie. */
export function BuildStepView({
  step,
  level,
  active,
  overlayOpen,
  complete,
  proceed,
  proceedLabel,
  onReset,
}: StepViewProps<BuildStep>) {
  return (
    <PlayArea
      step={step}
      mode="level"
      active={active}
      overlayOpen={overlayOpen}
      onSolved={complete}
      onReset={onReset}
      proceed={{ label: proceedLabel, onClick: proceed }}
      teaser={summaryAfter(level, level.steps.indexOf(step))?.lesson}
    />
  );
}
