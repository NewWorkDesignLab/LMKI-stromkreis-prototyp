import { useMemo, type ReactNode } from "react";
import type { Block } from "../../domain/types";
import type { Stage, StageSource } from "../../engine/lesson";
import { simulate } from "../../engine/simulate";
import { useRuntimeState } from "../../app/RuntimeContext";
import { Board } from "../../render/Board";
import { boardExtent } from "../../render/geometry";
import { BG } from "../../theme/colors";
import { Blocks } from "./Blocks";
import { useOperableBoard } from "./useOperableBoard";

/* Querformat für Schritte ohne Brett: links die Bühne (Anschauung oder Schaltung), rechts
   der Text. So passt ein Alltagsbezug mit großem Bild ohne Scrollen auf den Bildschirm,
   und Vermutung, Frage und Merksatz stehen sichtbar neben der Schaltung, um die es geht.
   Ohne Bühne bleibt es eine schmale, gut lesbare Textspalte. Zwei gleich breite Spalten:
   die Anschauung soll begleiten, nicht den Bildschirm füllen – und ein Brett aus dem
   Level passt in Originalgröße gerade hinein. Der Text steht oben bündig, damit „Weiter“
   in jedem Schritt an derselben Stelle beginnt. */
export function StageLayout({ stage, children }: { stage: ReactNode; children: ReactNode }) {
  if (!stage) return <div className="mx-auto max-w-2xl">{children}</div>;
  return (
    <div className="mx-auto grid max-w-5xl items-start gap-4 lg:grid-cols-2">
      {stage}
      {children}
    </div>
  );
}

const VISUAL = new Set<Block["k"]>(["widget", "image"]);

/** Trennt die erste Anschauung (Widget, Bild) für die Bühne vom übrigen Text. */
export function splitVisual(blocks: Block[] = []): { visual: Block | null; rest: Block[] } {
  const i = blocks.findIndex((b) => VISUAL.has(b.k));
  return i < 0
    ? { visual: null, rest: blocks }
    : { visual: blocks[i], rest: [...blocks.slice(0, i), ...blocks.slice(i + 1)] };
}

/** Eine Anschauung aus den Bausteinen des Schritts als Bühne. */
export function VisualStage({ block }: { block: Block }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <Blocks blocks={[block]} />
    </div>
  );
}

const CAPTION: Record<StageSource, string> = {
  own: "Deine Schaltung",
  solution: "So kann die Schaltung aussehen",
  start: "Der Aufbau",
};

const OPERABLE = new Set(["switch", "button", "spdt"]);

/* Die Schaltung eines Bauschritts zum Ansehen: mit Simulation (Lampen leuchten, Messwerte
   stehen da), ohne Werkzeuge. Schalter und Taster lassen sich bedienen, damit man die eigene
   Schaltung ausprobieren kann (useOperableBoard). Originalgröße wie beim Bauen; ist die
   Spalte schmaler, schrumpft sie mit. */
export function CircuitStage({ stage }: { stage: Stage }) {
  const { settings } = useRuntimeState();
  const board = useOperableBoard(stage.circuit, stage.build);
  const sim = useMemo(() => simulate(board.circuit), [board.circuit]);
  const { w, h } = boardExtent(stage.build.W, stage.build.H);
  const operable = Object.values(stage.circuit.parts).some((p) => OPERABLE.has(p.type));
  return (
    <figure className="rounded-2xl border border-stone-200 p-4" style={{ background: BG }}>
      <div className="flex justify-center">
        <Board
          level={stage.build}
          circuit={board.circuit}
          sim={sim}
          svgRef={board.svgRef}
          handlers={operable ? board.handlers : undefined}
          fit
          width={w}
          height={h}
          flow={settings.flowAnimation}
        />
      </div>
      <figcaption className="mt-2 text-center text-xs font-medium text-stone-500">
        {CAPTION[stage.source]}
      </figcaption>
    </figure>
  );
}
