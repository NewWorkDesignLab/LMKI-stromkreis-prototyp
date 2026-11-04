import { CheckCircle2 } from "lucide-react";
import { useState, type PointerEvent } from "react";
import type { BuildStep, Circuit, PartId, SimResult, Tried, TryCue } from "../../domain/types";
import { tryCue } from "../../engine/goals";
import { actuated } from "../../engine/parts";
import { SWITCH_OFF, SWITCH_ON } from "../../theme/colors";

/* Funktionsansicht zu „Der Öffner“: zeigt den Kontakt im Taster. Ob beide Taster einmal
   gedrückt UND wieder losgelassen wurden, prüft das Ziel „tried“ (engine/goals.ts); gezählt
   werden nur Betätigungen hier, nicht am Brett. Sie erscheint erst nach dem Verdrahten (PlayArea).
   Welche Taster und Lampen gemeint sind, steht im Level (`contactLab`).
   Was zu tun ist, zeigt die Kachel selbst statt eines Hinweistexts darüber: orange = hier ist
   etwas zu tun (wie das offene Ziel in der Zielliste), grün mit Häkchen = ausprobiert, grüner
   Rahmen um alles = Ziel erreicht. Die Kontaktbrücke trägt die Farben des Schalters auf dem
   Brett; Grün bleibt so allein dem Erreichten vorbehalten. */

type Config = NonNullable<BuildStep["contactLab"]>;

/* Zustand eines Kontakts in einer Zeile. Sie blitzt kurz auf, wenn die Lampe angeht – das
   ist die Wirkung, auf die man achten soll; beim Ausgehen und beim Erscheinen der Ansicht
   bleibt sie ruhig. Der neue key beim Umspringen startet die Animation neu. */
function StateLine({ closed, lit }: { closed: boolean; lit: boolean }) {
  const [litAtStart] = useState(lit);
  const [switched, setSwitched] = useState(false);
  if (!switched && lit !== litAtStart) setSwitched(true);
  return (
    <p aria-live="polite" className="text-sm font-medium">
      <span
        key={String(lit)}
        className={`-mx-1 rounded px-1 ${lit && switched ? "state-flash" : ""}`}
      >
        Kontakt {closed ? "geschlossen" : "offen"} · Lampe {lit ? "an" : "aus"}
      </span>
    </p>
  );
}

interface Props {
  config: Config;
  circuit: Circuit;
  sim: SimResult;
  tried: Tried;
  /** das Ausprobieren-Ziel ist erreicht */
  solved: boolean;
  press: (id: PartId) => void;
  release: (id: PartId) => void;
}

const TILE_BORDER: Record<TryCue, string> = {
  press: "border-amber-400",
  release: "border-amber-400",
  wait: "border-stone-200",
  done: "border-emerald-400",
};

export function ContactLab({ config, circuit, sim, tried, solved, press, release }: Props) {
  const contacts = [
    { ...config.closer, name: "Schließer" },
    { ...config.opener, name: "Öffner" },
  ];
  return (
    <section
      className={`relative rounded-xl border p-3 transition-colors ${solved ? "solved-glow border-emerald-400" : "border-stone-200"} bg-stone-50`}
    >
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-stone-400">
        Funktionsansicht
      </p>
      <h3 className="mb-3 font-semibold text-stone-800">Was bewegt sich im Taster?</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {contacts.map(({ contact: at, lamp, name }) => {
          const c = circuit.parts[at];
          /* Beim Levelwechsel rendert die Kachel kurz gegen das alte Feld –
             ohne diese Zeile reißt sie die ganze App mit. */
          if (!c) return null;
          const down = actuated(c);
          const cue = tryCue(tried, at);
          const bridgeY = c.closed ? 105 : c.nc ? 132 : 78;
          /* Gedrückt halten am Knopf wie am Tasterkopf in der Zeichnung: die Zeiger-Erfassung
             hält den Taster, auch wenn der Finger dabei vom Ziel abrutscht. */
          const hold = {
            onPointerDown: (e: PointerEvent<Element>) => {
              if (e.button !== 0 || !e.isPrimary) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              press(at);
            },
            onPointerUp: () => release(at),
            onPointerCancel: () => release(at),
            onLostPointerCapture: () => release(at),
          };
          return (
            <div
              key={at}
              className={`rounded-lg border-2 bg-white p-3 transition-colors ${TILE_BORDER[cue]}`}
            >
              <h4 className="flex items-center justify-between text-sm font-semibold">
                {name}
                {cue === "done" && (
                  <CheckCircle2
                    size={20}
                    className="goal-pop text-emerald-600"
                    aria-label="ausprobiert"
                  />
                )}
              </h4>
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
                  {...hold}
                  className="cursor-pointer"
                  style={{
                    touchAction: "none",
                    transform: `translateY(${down ? 27 : 0}px)`,
                    transition: "transform 120ms",
                  }}
                >
                  {/* Tastfläche um den Tasterkopf, größer als der gezeichnete Kopf */}
                  <rect x="80" y="0" width="80" height="44" fill="transparent" />
                  <rect x="96" y="15" width="48" height="13" rx="4" fill="#44403c" />
                  <path
                    d={`M120 28 V${bridgeY - (down ? 27 : 0)}`}
                    stroke="#a8a29e"
                    strokeWidth="4"
                  />
                </g>
                <path
                  d={`M75 ${bridgeY} H165`}
                  stroke={c.closed ? SWITCH_ON : SWITCH_OFF}
                  strokeWidth="7"
                  strokeLinecap="round"
                />
              </svg>
              <StateLine closed={c.closed} lit={sim.lit.has(lamp)} />
              <button
                type="button"
                className="mt-3 w-full rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white select-none"
                style={{ touchAction: "none" }}
                aria-label={`${name} gedrückt halten`}
                aria-pressed={down}
                {...hold}
                onKeyDown={(e) => {
                  if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                    e.preventDefault();
                    press(at);
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    release(at);
                  }
                }}
                onBlur={() => release(at)}
              >
                {down ? "Jetzt loslassen" : "Gedrückt halten"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
