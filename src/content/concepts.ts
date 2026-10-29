import type { ConceptId } from "../domain/types";

/* Kompetenzen, die Level üben. Die Bewertung (services/assessment) rechnet pro
   Kompetenz, nicht pro Level – so lässt sich später aus einem Level-Fehlschlag
   ablesen, welches Konzept noch wackelt, und passende Level vorschlagen. */
export interface ConceptDef {
  id: ConceptId;
  name: string;
  /** Konzepte, die vorher sitzen sollten */
  requires?: ConceptId[];
}

export const CONCEPTS: ConceptDef[] = [
  { id: "stromkreis", name: "Geschlossener Stromkreis" },
  { id: "schalter", name: "Schalter", requires: ["stromkreis"] },
  { id: "taster", name: "Taster", requires: ["schalter"] },
  { id: "oeffner", name: "Öffner", requires: ["taster"] },
  { id: "verbraucher", name: "Verbraucher", requires: ["stromkreis"] },
  { id: "reihenschaltung", name: "Reihenschaltung", requires: ["stromkreis"] },
  { id: "parallelschaltung", name: "Parallelschaltung", requires: ["stromkreis"] },
  { id: "logik-und", name: "UND (Reihe)", requires: ["reihenschaltung"] },
  { id: "logik-oder", name: "ODER (parallel)", requires: ["parallelschaltung"] },
  { id: "logik-xor", name: "Wechselschaltung (XOR)", requires: ["wechselschalter"] },
  { id: "wechselschalter", name: "Wechselschalter", requires: ["schalter"] },
  { id: "steuerlogik", name: "Steuerlogik", requires: ["oeffner", "logik-und"] },
  { id: "kurzschluss", name: "Kurzschluss", requires: ["stromkreis"] },
  { id: "sicherung", name: "Sicherung", requires: ["kurzschluss"] },
  { id: "led", name: "LED und Polung", requires: ["stromkreis"] },
  { id: "widerstand", name: "Widerstand", requires: ["stromkreis"] },
  { id: "strommessung", name: "Strom messen", requires: ["reihenschaltung"] },
  { id: "spannungsmessung", name: "Spannung messen", requires: ["parallelschaltung"] },
  { id: "spannungsteilung", name: "Spannungsteilung", requires: ["reihenschaltung", "widerstand"] },
  { id: "stromteilung", name: "Stromteilung", requires: ["parallelschaltung", "widerstand"] },
  { id: "ohmsches-gesetz", name: "Ohmsches Gesetz", requires: ["widerstand"] },
  { id: "knotenpunkt", name: "Knotenpunkt", requires: ["parallelschaltung"] },
  { id: "kreuzung", name: "Kreuzung ohne Verbindung", requires: ["knotenpunkt"] },
  { id: "quellen-in-reihe", name: "Quellen in Reihe", requires: ["reihenschaltung"] },
  {
    id: "schaltplan-lesen",
    name: "Schaltplan lesen",
    requires: ["reihenschaltung", "parallelschaltung"],
  },
  { id: "fehlersuche", name: "Fehlersuche", requires: ["schaltplan-lesen"] },
];
