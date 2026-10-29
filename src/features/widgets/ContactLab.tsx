import type { BuildStep, Circuit, PartId, SimResult, Tried } from "../../domain/types";
import { actuated } from "../../engine/parts";

/* Funktionsansicht zu „Der Öffner“: zeigt den Kontakt im Taster. Ob beide Taster einmal
   gedrückt UND wieder losgelassen wurden, prüft das Ziel „tried“ (engine/goals.ts); die
   Ansicht liest nur dessen Fortschritt. Welche Taster und Lampen gemeint sind, steht im
   Level (`contactLab`). */

type Config = NonNullable<BuildStep["contactLab"]>;

interface Props {
  config: Config;
  circuit: Circuit;
  sim: SimResult;
  /** übrige Ziele erreicht – erst dann zählt das Ausprobieren */
  wired: boolean;
  tried: Tried;
  press: (id: PartId) => void;
  release: () => void;
}

export function ContactLab({ config, circuit, sim, wired, tried, press, release }: Props) {
  const closer = tried[config.closer.contact] ?? 0;
  const opener = tried[config.opener.contact] ?? 0;
  const contacts = [
    { ...config.closer, name: "Schließerkontakt" },
    { ...config.opener, name: "Öffnerkontakt" },
  ];
  return (
    <section className="rounded-xl border border-stone-200 bg-stone-50 p-3">
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
          : closer === 2 && opener === 2
            ? "Beide Taster ausprobiert."
            : closer === 1
              ? "Lass den Schließer wieder los. Beobachte, wie der Kontakt zurückkehrt."
              : opener === 1
                ? "Lass den Öffner wieder los. Beobachte, wie der Kontakt zurückkehrt."
                : closer === 2
                  ? "Halte jetzt den Öffner gedrückt. Beobachte die Unterbrechung."
                  : opener === 2
                    ? "Halte jetzt den Schließer gedrückt. Beobachte die Kontaktbrücke."
                    : "Halte einen der beiden Taster gedrückt und beobachte die Kontaktbrücke."}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {contacts.map(({ contact: at, lamp, name }) => {
          const c = circuit.parts[at];
          /* Beim Levelwechsel rendert die Kachel kurz gegen das alte Feld –
             ohne diese Zeile reißt sie die ganze App mit. */
          if (!c) return null;
          const down = actuated(c);
          const bridgeY = c.closed ? 105 : c.nc ? 132 : 78;
          return (
            <div key={at} className="rounded-lg border border-stone-200 bg-white p-3">
              <h4 className="text-sm font-semibold">Taster mit {name}</h4>
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
                  press(at);
                }}
                onPointerUp={release}
                onPointerCancel={release}
                onLostPointerCapture={release}
                onKeyDown={(e) => {
                  if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                    e.preventDefault();
                    press(at);
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
