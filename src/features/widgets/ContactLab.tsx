import { useEffect, useState } from "react";
import type { CellKey, Grid, SimResult } from "../../domain/types";
import { FridgeOrientation } from "./FridgeOrientation";

/* Funktionsansicht zu „Der Öffner“: zeigt den Kontakt im Taster und verlangt, dass
   beide Taster einmal gedrückt UND wieder losgelassen wurden. Bindet sich an die
   Zellen dieses Levels (Taster bei 2,1 und 4,1, Lampen darunter). */

interface Lab {
  closer: 0 | 1 | 2;
  opener: 0 | 1 | 2;
}
const FRESH: Lab = { closer: 0, opener: 0 };

const CONTACTS: { at: CellKey; lamp: CellKey; name: string }[] = [
  { at: "2,1", lamp: "2,2", name: "Schließerkontakt" },
  { at: "4,1", lamp: "4,2", name: "Öffnerkontakt" },
];

/** Je Taster 0 = noch nicht angefasst, 1 = gerade gedrückt, 2 = gedrückt UND wieder losgelassen.
    Zwei getrennte Zähler, damit die Reihenfolge egal ist – wer mit dem Öffner anfängt,
    soll nicht ins Leere laufen. Nur bei richtiger Verdrahtung zählen die Betätigungen. */
export function useContactLab(enabled: boolean, grid: Grid, wired: boolean) {
  const [lab, setLab] = useState<Lab>(FRESH);

  useEffect(() => {
    if (!enabled) return;
    if (!wired) {
      if (lab.closer || lab.opener) setLab(FRESH);
      return;
    }
    /* „betätigt“ statt „leitet“ – beim Öffner ist das gegenläufig. */
    const held = (k: CellKey) => {
      const c = grid[k];
      return c ? (c.nc ? !c.closed : !!c.closed) : false;
    };
    const next = (cur: 0 | 1 | 2, down: boolean): 0 | 1 | 2 =>
      cur === 2 ? 2 : down ? 1 : cur === 1 ? 2 : 0;
    const n: Lab = { closer: next(lab.closer, held("2,1")), opener: next(lab.opener, held("4,1")) };
    if (n.closer !== lab.closer || n.opener !== lab.opener) setLab(n);
  }, [enabled, wired, grid, lab]);

  return { lab, done: lab.closer === 2 && lab.opener === 2, reset: () => setLab(FRESH) };
}

interface Props {
  grid: Grid;
  sim: SimResult;
  wired: boolean;
  lab: Lab;
  done: boolean;
  press: (x: number, y: number) => void;
  release: () => void;
}

export function ContactLab({ grid, sim, wired, lab, done, press, release }: Props) {
  const pressAt = (at: CellKey) => press(...(at.split(",").map(Number) as [number, number]));
  return (
    <section className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-stone-400">
        Funktionsansicht
      </p>
      <h3 className="font-semibold text-stone-800">Was bewegt sich im Taster?</h3>
      <p className="mt-1 text-xs text-stone-600">
        Beide Taster kehren beim Loslassen zurück. Betätige sie hier oder im Schaltplan.
      </p>
      <p className="my-3 rounded-lg bg-white p-2 text-sm font-medium" aria-live="polite">
        {!wired
          ? "Verdrahte zuerst beide Lampenzweige."
          : done
            ? "Der Schließer schließt beim Betätigen. Der Öffner öffnet beim Betätigen."
            : lab.closer === 1
              ? "Lass den Schließer wieder los. Beobachte, wie der Kontakt zurückkehrt."
              : lab.opener === 1
                ? "Lass den Öffner wieder los. Beobachte, wie der Kontakt zurückkehrt."
                : lab.closer === 2
                  ? "Halte jetzt den Öffner gedrückt. Beobachte die Unterbrechung."
                  : lab.opener === 2
                    ? "Halte jetzt den Schließer gedrückt. Beobachte die Kontaktbrücke."
                    : "Halte einen der beiden Taster gedrückt und beobachte die Kontaktbrücke."}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CONTACTS.map(({ at, lamp, name }) => {
          const c = grid[at];
          /* Beim Levelwechsel rendert die Kachel kurz gegen das alte Feld –
             ohne diese Zeile reißt sie die ganze App mit. */
          if (!c) return null;
          const down = c.nc ? !c.closed : c.closed;
          const bridgeY = c.closed ? 105 : c.nc ? 132 : 78;
          return (
            <div key={at} className="rounded-lg border border-stone-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold">Taster mit {name}</h4>
                {c.nc && (
                  <div className="shrink-0">
                    <FridgeOrientation />
                  </div>
                )}
              </div>
              <svg
                viewBox="0 0 240 160"
                className="w-full"
                style={{ maxHeight: 170 }}
                role="img"
                aria-label={`${name}: ${down ? "betätigt" : "losgelassen"}, Kontakt ${c.closed ? "geschlossen" : "offen"}`}
              >
                <path
                  d="M20 135 V105 H80 M160 105 H220 V135"
                  fill="none"
                  stroke="#78716c"
                  strokeWidth="4"
                />
                <circle cx="80" cy="105" r="5" fill="#44403c" />
                <circle cx="160" cy="105" r="5" fill="#44403c" />
                <g
                  style={{
                    transform: `translateY(${down ? 27 : 0}px)`,
                    transition: "transform 120ms",
                  }}
                >
                  <rect x="96" y="15" width="48" height="13" rx="4" fill="#44403c" />
                  <path
                    d={`M120 28 V${bridgeY - (down ? 27 : 0)}`}
                    stroke="#a8a29e"
                    strokeWidth="4"
                  />
                </g>
                <path
                  d={`M75 ${bridgeY} H165`}
                  stroke={c.closed ? "#047857" : "#b45309"}
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <text x="175" y="46" fontSize="11" fill="#57534e">
                  {down ? "↓ betätigt" : "losgelassen"}
                </text>
              </svg>
              <p className="text-sm font-medium">
                Kontakt {c.closed ? "geschlossen · verbunden" : "offen · getrennt"}
              </p>
              <p className="mt-1 text-xs text-stone-600">
                Lampe {sim.lit.has(lamp) ? "an" : "aus"}
              </p>
              <button
                type="button"
                className="mt-3 w-full rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white select-none"
                style={{ touchAction: "none" }}
                aria-label={`${name} gedrückt halten`}
                aria-pressed={down}
                onPointerDown={(e) => {
                  if (e.button !== 0 || !e.isPrimary) return;
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  pressAt(at);
                }}
                onPointerUp={release}
                onPointerCancel={release}
                onLostPointerCapture={release}
                onKeyDown={(e) => {
                  if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                    e.preventDefault();
                    pressAt(at);
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    release();
                  }
                }}
                onBlur={release}
              >
                {down ? "Loslassen zum Zurückkehren" : "Gedrückt halten"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
