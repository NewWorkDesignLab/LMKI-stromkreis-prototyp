import type { Curriculum } from "../domain/types";

/* Standard-Lehrplan: welche Level in welcher Reihenfolge und unter welchem Kapitel.
   Referenziert Level nur per ID; was im Katalog liegt, aber hier fehlt, ist
   ausgeblendet, bleibt aber für Sequenzierer und API abrufbar.

   Stand Testdurchlauf September 2026: der Dimmer ersetzt „Der Widerstand“ im
   Kapitel „Widerstand, Messen & Rechnen“, aus dem Kapitel „Verbindungen im
   Schaltplan“ ist nur das erste Level sichtbar, und „Der Not-Aus“ & Co. hängen
   hinten, bis sie einsortiert werden. */
export const DEFAULT_CURRICULUM: Curriculum = {
  chapters: [
    {
      id: "grundlagen",
      name: "Stromkreis-Grundlagen",
      levelIds: [
        "schliesse-den-stromkreis",
        "der-schalter",
        "reihenschaltung-und",
        "parallelschaltung-beide-lampen",
        "waehle-den-stromweg",
      ],
    },
    {
      id: "schutz",
      name: "Stromfluss & Schutz",
      levelIds: [
        "der-kurzschluss",
        "die-sicherung",
        "durchlass-und-sperrrichtung-der-led",
        "der-vorwiderstand",
      ],
    },
    {
      id: "steuern",
      name: "Schalten & Steuern",
      levelIds: [
        "der-taster",
        "parallelschaltung-oder",
        "der-wechselschalter",
        "die-wechselschaltung",
        "motor-und-summer",
      ],
    },
    {
      id: "messen",
      name: "Widerstand, Messen & Rechnen",
      levelIds: [
        "der-dimmer",
        "amperemeter-in-reihe",
        "voltmeter-parallel",
        "reihenschaltung-teilt-die-spannung",
        "parallelschaltung-teilt-den-strom",
        "ohmsches-gesetz",
      ],
    },
    {
      id: "schaltplan",
      name: "Verbindungen im Schaltplan",
      levelIds: ["knotenpunkt-oder-kreuzung"],
    },
    {
      id: "erweiterung",
      name: "Schaltungen verstehen & ausprobieren",
      levelIds: [
        "fehlersuche-die-wechselschaltung",
        "das-licht-im-schalter",
        "der-oeffner",
        "der-not-aus",
      ],
    },
  ],
};
