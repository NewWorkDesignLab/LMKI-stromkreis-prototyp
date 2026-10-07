import { useState } from "react";
import type { Grid } from "../../domain/types";
import { INK, WIRE } from "../../theme/colors";
import { Formel } from "./Formel";

export function OhmLab({ grid }: { grid: Grid }) {
  const [wanted, setWanted] = useState("R");
  const resistor = grid["2,0"];
  const additionalR = resistor?.r ?? 100;
  const r = 90 + additionalR;
  const u = 9;
  const i = u / r;
  const fmt = (value, digits = 2) =>
    value.toLocaleString("de-DE", { maximumFractionDigits: digits });
  const formula = { U: "U = R · I", R: "R = U / I", I: "I = U / R" }[wanted];
  const example = {
    U: `U = ${fmt(r)} Ω · ${fmt(i, 6)} A ≈ ${fmt(u)} V`,
    R: `R_ges = ${fmt(u)} V / ${fmt(i, 6)} A ≈ ${fmt(r)} Ω`,
    I: `I = ${fmt(u)} V / ${fmt(r)} Ω ≈ ${fmt(i, 6)} A = ${fmt(i * 1000, 3)} mA`,
  }[wanted];
  return (
    <section className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-stone-400">
        Rechenhilfe
      </p>
      <h3 className="font-semibold text-stone-800">
        Wie hängen Spannung, Widerstand und Strom zusammen?
      </h3>
      <p className="mt-1 text-xs text-stone-600">
        Das Ohmsche Gesetz beschreibt die proportionalen Zusammenhänge der drei elektrischen
        Grundgrößen, Strom (I), der Spannung (U) und dem Widerstand (R). Mit seiner Hilfe lässt sich
        der fehlende Wert berechnen, insofern die beiden anderen bekannt sind.
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
            {["U", "R", "I"].map((symbol) => (
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
          <p className="mt-2 text-xs text-stone-600">
            Gegeben sind Quellspannung: <Formel>U = 9 V</Formel> und die Zielgröße:{" "}
            <Formel>I = 29 mA</Formel> sowie der Widerstand der Lampe:{" "}
            <Formel>R_Lampe = 90 Ω</Formel>
          </p>
          <p className="mt-1 text-xs text-stone-600">
            Gesucht ist der zusätzliche Widerstand <Formel>R_zus</Formel> in Ω
          </p>
          <p className="mt-3 text-xl font-semibold" aria-live="polite">
            <Formel>{formula}</Formel>
          </p>
          <p className="mt-1 text-sm" aria-live="polite">
            <Formel>{example}</Formel>
          </p>
        </div>
      </div>
      <details className="mt-3 rounded-lg border border-stone-200 bg-white p-3 text-sm">
        <summary className="cursor-pointer font-medium">Rechenweg anzeigen</summary>
        <div className="mt-2 space-y-1 text-stone-700">
          <p>
            Zielgröße der Stromstärke: <Formel>I = 29 mA = 0,029 A.</Formel>
          </p>
          <p>
            <Formel>R_ges = U / I = 9 V / 0,029 A ≈ 310,34 Ω.</Formel>
          </p>
          <p>
            <Formel>R_zus = R_ges − R_Lampe = 310,34 Ω − 90 Ω = 220,34 Ω.</Formel>
          </p>
          <p>
            Auf die verfügbare Widerstandsstufe abgerundet: <Formel>R_zus = 220 Ω</Formel>
          </p>
          <p>
            Probe: <Formel>I = 9 V / 310 Ω ≈ 0,029032 A = 29,032 mA ≈ 29 mA.</Formel>
          </p>
          <p>
            {" "}
            Damit ergibt sich ein <i>einzustellender Zusatzwiderstand</i> von <Formel>220 Ω</Formel>{" "}
            in der Schaltung.
          </p>
        </div>
      </details>
    </section>
  );
}
