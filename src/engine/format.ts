import type { Part } from "../domain/types";
import { P } from "./parts";

/* Zahlen im deutschen Format: Komma als Dezimaltrenner, passende Einheit. */
export const de = (s) => String(s).replace(".", ",");
/* Nachkommastellen der Anzeige in mA: ab 10 mA ganze, darunter eine Stelle */
const mADecimals = (a) => (a >= 0.01 ? 0 : 1);
export const fmtA = (i) => {
  const a = Math.abs(i);
  return a >= 1
    ? `${de(a.toFixed(2))} A`
    : `${a < 0.0005 ? "0" : de((a * 1000).toFixed(mADecimals(a)))} mA`;
};
export const fmtV = (v) => `${de(Math.abs(v).toFixed(2))} V`;

/* Der Wert, den ein Messgerät anzeigt, als Zahl in der Grundeinheit (A, V). Wer abliest,
   kennt nur die Anzeige – Messaufgaben vergleichen deshalb damit, nicht mit dem genauen Wert. */
export const shownA = (i) => {
  const a = Math.abs(i);
  if (a >= 1) return Number(a.toFixed(2));
  return a < 0.0005 ? 0 : Number((a * 1000).toFixed(mADecimals(a))) / 1000;
};
export const shownV = (v) => Number(Math.abs(v).toFixed(2));
export const fmtR = (r) =>
  r >= 1000 ? `${de((r / 1000).toFixed(r % 1000 ? 1 : 0))} kΩ` : `${r} Ω`;

/* Nennwert wie auf dem Typenschild: ohne Nachkommastellen, die nichts aussagen („9 V“). */
const nominalV = (v: number) => `${de(v)} V`;

/** Kennwerte eines Bauteils als Beschriftungszeilen: was auf Sockel oder Typenschild steht,
    gilt unabhängig von der Schaltung. `withResistance` ergänzt in Rechenleveln den
    Bauteilwiderstand – eine Aufgabenkonvention, kein Aufdruck (siehe PROJEKT.md, Grenzen).
    Widerstand und Sicherung beschriftet das Brett selbst; Motor und Summer haben im Modell
    keine Nennwerte. */
export function ratingLines(part: Part, withResistance: boolean): string[] {
  const ohm = withResistance ? [fmtR(P(part, "r"))] : [];
  switch (part.type) {
    case "battery":
      return [nominalV(P(part, "u"))];
    case "lamp":
      return [`${nominalV(P(part, "un"))} / ${fmtA(P(part, "in"))}`, ...ohm];
    case "led":
      return [`${nominalV(P(part, "vf"))} / ${fmtA(P(part, "in"))}`];
    case "motor":
    case "buzzer":
      return ohm;
    default:
      return [];
  }
}
