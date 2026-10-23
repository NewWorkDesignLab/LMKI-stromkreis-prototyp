import { useEffect, useMemo, useState } from "react";
import type { BuildStep, CheckResult, Circuit } from "../../domain/types";
import { cloneCircuit, emptyCircuit } from "../../engine/circuit";
import { checkLevel } from "../../engine/goals";
import { latchTripped, type PlayMode } from "../../engine/editing";
import { simulate } from "../../engine/simulate";
import { useContactLab } from "../widgets/ContactLab";
import { useBoardEditor } from "./useBoardEditor";

const NOT_PLAYING: CheckResult = { items: [], won: false };

interface Options {
  /** Ziele erreicht; mit der Schaltung, die sie erreicht hat */
  onSolved?: (circuit: Circuit) => void;
  onReset?: () => void;
  /** Ziehhilfe (Einstellung) */
  snapWires?: boolean;
}

/* Ein Spielversuch an einem Bauschritt: Brett, Simulation, Zielprüfung und alles, was
   daraus folgt. Gilt für genau einen Schritt – beim Wechsel wird die Komponente neu
   eingehängt (key), damit gar kein Zustand des alten Levels überlebt. */
export function usePlaySession(
  level: BuildStep,
  mode: PlayMode,
  active: boolean,
  { onSolved, onReset, snapWires = false }: Options = {},
) {
  const editor = useBoardEditor(level, mode, active, snapWires);
  const { circuit, update, commit } = editor;
  const [seen, setSeen] = useState(false);

  const sim = useMemo(() => simulate(circuit), [circuit]);

  /* Manche Ziele fragen nicht nach dem Endzustand, sondern danach, ob etwas
     unterwegs schon einmal eingetreten ist – sonst ließe sich „Der Not-Aus“ lösen,
     ohne dass je Strom geflossen wäre. `latch` am Level sagt, worauf zu achten ist. */
  useEffect(() => {
    if (!level.latch || seen) return;
    if (level.latch.lit.every((id) => sim.lit.has(id))) setSeen(true);
  }, [level, sim, seen]);

  const check = useMemo(
    () => (mode === "level" ? checkLevel(level, circuit, sim, seen) : NOT_PLAYING),
    [mode, level, circuit, sim, seen],
  );

  const contactLab = useContactLab(level.contactLab, circuit, check.won);
  const won = check.won && (!level.contactLab || contactLab.done);

  useEffect(() => {
    if (won && mode === "level") onSolved?.(circuit);
    // onSolved bewusst nicht in den Abhängigkeiten: gemeldet wird beim Übergang zu „gelöst“
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  /* Auslösen wird in die Schaltung übernommen: die Sicherung bleibt offen, bis sie mit
     Antippen wieder eingeschaltet wird. Folgezustand, kein Schritt im Verlauf. */
  useEffect(() => {
    update((c) => latchTripped(c, sim.tripped));
  }, [sim, update]);

  /* Zurücksetzen und Leeren sind Änderungen am Aufbau – sie lassen sich rückgängig machen. */
  const reset = () => {
    editor.cancelGesture();
    contactLab.reset();
    setSeen(false); // sonst bliebe „lief schon mal“ über das Zurücksetzen hinweg stehen
    commit(() => cloneCircuit(level.circuit));
    onReset?.();
  };
  const clear = () => commit(() => emptyCircuit());

  return { ...editor, sim, check, won, contactLab, reset, clear };
}
