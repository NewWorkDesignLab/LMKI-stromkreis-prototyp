import { useEffect, useMemo, useState } from "react";
import type { CheckResult, LevelDef } from "../../domain/types";
import { checkLevel } from "../../engine/goals";
import { cloneGrid, latchTripped, type PlayMode } from "../../engine/editing";
import { simulate } from "../../engine/simulate";
import { useContactLab } from "../widgets/ContactLab";
import { useBoardEditor } from "./useBoardEditor";

const NOT_PLAYING: CheckResult = { items: [], won: false };

interface Callbacks {
  onSolved?: () => void;
  onReset?: () => void;
}

/* Ein Spielversuch an einem Level: Brett, Simulation, Zielprüfung und alles, was
   daraus folgt. Gilt für genau ein Level – beim Levelwechsel wird die Komponente
   neu eingehängt (key), damit gar kein Zustand des alten Levels überlebt.
   Das ersetzt das frühere, sorgfältig gebündelte „loadBoard“. */
export function usePlaySession(
  level: LevelDef,
  mode: PlayMode,
  { onSolved, onReset }: Callbacks = {},
) {
  const editor = useBoardEditor(level, mode);
  const { grid, setGrid } = editor;
  const [seen, setSeen] = useState(false);

  const sim = useMemo(() => simulate(grid), [grid]);

  /* Manche Ziele fragen nicht nach dem Endzustand, sondern danach, ob etwas
     unterwegs schon einmal eingetreten ist – sonst ließe sich „Der Not-Aus“ lösen,
     ohne dass je Strom geflossen wäre. `latch` am Level sagt, worauf zu achten ist. */
  useEffect(() => {
    if (!level.latch || seen) return;
    if (level.latch.lit.every((k) => sim.lit.has(k))) setSeen(true);
  }, [level, sim, seen]);

  const check = useMemo(
    () => (mode === "level" ? checkLevel(level, grid, sim, seen) : NOT_PLAYING),
    [mode, level, grid, sim, seen],
  );

  const contactLab = useContactLab(!!level.contactLab, grid, check.won);
  const won = check.won && (!level.contactLab || contactLab.done);

  useEffect(() => {
    if (won && mode === "level") onSolved?.();
    // onSolved bewusst nicht in den Abhängigkeiten: gemeldet wird beim Übergang zu „gelöst“
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  /* Auslösen wird ins Feld übernommen: die Sicherung bleibt offen, bis sie mit
     Antippen wieder eingeschaltet wird. */
  useEffect(() => {
    setGrid((p) => latchTripped(p, sim.tripped));
  }, [sim, setGrid]);

  const reset = () => {
    editor.cancelGesture();
    contactLab.reset();
    setSeen(false); // sonst bliebe „lief schon mal“ über das Zurücksetzen hinweg stehen
    setGrid(cloneGrid(level.cells));
    onReset?.();
  };
  const clear = () => setGrid({});

  return { ...editor, sim, check, won, contactLab, reset, clear };
}
