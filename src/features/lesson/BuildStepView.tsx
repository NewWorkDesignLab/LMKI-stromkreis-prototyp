import type { BuildStep } from "../../domain/types";
import { PlayArea } from "../play/PlayArea";
import type { StepViewProps } from "./stepViews";

/* Bauschritt: das Spielfeld. Erreicht die Schaltung die Ziele, ist der Schritt erledigt;
   weiter geht es erst auf Knopfdruck, damit man das Ergebnis noch ansehen kann. */
export function BuildStepView({
  step,
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
    />
  );
}
