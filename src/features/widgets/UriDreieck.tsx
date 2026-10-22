import { useState } from "react";
import { INK, WIRE } from "../../theme/colors";
import { Formel } from "./Formel";

type Wanted = "U" | "R" | "I";

/* URI-Dreieck: Wer die gesuchte Größe wählt, sieht, wie sich die Formel umstellt.
   Allgemein gehalten – die Werte einer Aufgabe stehen in deren Text, nicht hier. */
export function UriDreieck() {
  const [wanted, setWanted] = useState<Wanted>("R");
  const formula = { U: "U = R · I", R: "R = U / I", I: "I = U / R" }[wanted];
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs text-stone-600">
        Das Ohmsche Gesetz verbindet Spannung (U), Widerstand (R) und Strom (I). Sind zwei Größen
        bekannt, lässt sich die dritte berechnen.
      </p>
      <div className="flex flex-wrap items-center gap-4 mt-3">
        <svg
          viewBox="0 0 180 150"
          width="180"
          height="150"
          role="img"
          aria-label={`URI-Dreieck: U oben, R und I unten. ${wanted === "U" ? "Malpunkt zwischen R und I." : `Geteiltzeichen zwischen U und ${wanted === "R" ? "I" : "R"}.`} Gesucht: ${wanted}. ${formula}`}
        >
          <style>{`
            .ohm-selection { transition: opacity 280ms ease-in-out; }
            .ohm-operation { animation: ohm-operation-in 240ms ease-out both; transform-box: fill-box; transform-origin: center; }
            @keyframes ohm-operation-in {
              from { opacity: 0; transform: scale(0.75); }
              to { opacity: 1; transform: scale(1); }
            }
            @media (prefers-reduced-motion: reduce) {
              .ohm-selection { transition: none; }
              .ohm-operation { animation: none; }
            }
          `}</style>
          {[
            { symbol: "U", d: "M90 8 L49 74 H131 Z" },
            { symbol: "R", d: "M49 74 H90 V140 H8 Z" },
            { symbol: "I", d: "M90 74 H131 L172 140 H90 Z" },
          ].map(({ symbol, d }) => (
            <path
              key={symbol}
              className="ohm-selection"
              d={d}
              fill="#fef3c7"
              opacity={wanted === symbol ? 1 : 0}
            />
          ))}
          <path
            d="M90 8 L8 140 H172 Z M49 74 H131 M90 74 V140"
            fill="none"
            stroke={WIRE}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {[
            { wanted: "I", sign: "÷", x: 68, y: 74 },
            { wanted: "R", sign: "÷", x: 112, y: 74 },
            { wanted: "U", sign: "·", x: 90, y: 108 },
          ]
            .filter((operation) => operation.wanted === wanted)
            .map(({ sign, x, y }) => (
              <g key={`${x}-${y}`} className="ohm-operation">
                <rect x={x - 10} y={y - 11} width="20" height="22" rx="5" fill="#fafaf9" />
                <text
                  x={x}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="24"
                  fontWeight="700"
                  fill={INK}
                >
                  {sign}
                </text>
              </g>
            ))}
          {[
            { symbol: "U", x: 90, y: 53 },
            { symbol: "R", x: 61, y: 116 },
            { symbol: "I", x: 119, y: 116 },
          ].map(({ symbol, x, y }) => (
            <g key={symbol}>
              <text
                x={x}
                y={y}
                textAnchor="middle"
                fontSize="26"
                fontWeight="600"
                fontStyle="italic"
                fontFamily="Georgia, 'Times New Roman', serif"
                fill={INK}
              >
                {symbol}
              </text>
            </g>
          ))}
        </svg>
        <div className="flex-1 min-w-[180px]">
          <div className="flex gap-2" role="group" aria-label="Gesuchte Größe">
            {(["U", "R", "I"] as const).map((symbol) => (
              <button
                key={symbol}
                type="button"
                aria-pressed={wanted === symbol}
                onClick={() => setWanted(symbol)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${wanted === symbol ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-700 border-stone-200"}`}
              >
                {symbol}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xl font-semibold" aria-live="polite">
            <Formel>{formula}</Formel>
          </p>
        </div>
      </div>
    </div>
  );
}
