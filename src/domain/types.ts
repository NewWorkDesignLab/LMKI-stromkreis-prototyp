/* Fachliche Grundtypen. Reine Typen, keine Laufzeitabhängigkeit: Engine, Inhalte,
   Dienste, API und Oberfläche sprechen alle über diese Datei miteinander. */

/* ---------- Schaltung ---------- */

export type Side = "N" | "S" | "W" | "E";
export type Orient = "h" | "v";

/** Rasterpunkt „x,y“ – ein Ort, keine Kennung. */
export type PointKey = string;
/** Leitung zwischen zwei benachbarten Punkten, „x,y|x,y“ in kanonischer Reihenfolge (wireKey). */
export type WireKey = string;
/** Kennung eines Bauteils, angelehnt an die Betriebsmittelkennzeichnung: G1, E1, S2 … */
export type PartId = string;

/** Alles, was als Bauteil auf einem Rasterpunkt sitzen kann. */
export type PartType =
  | "cross"
  | "battery"
  | "lamp"
  | "resistor"
  | "led"
  | "motor"
  | "buzzer"
  | "fuse"
  | "ammeter"
  | "voltmeter"
  | "switch"
  | "button"
  | "spdt";

/** Einstellbare Eigenschaften eines Bauteils – alles außer Typ und Ort. */
export interface PartProps {
  /** Lage von Zweipolen: "h" = W–E, "v" = N–S */
  orient?: Orient;
  /** Wechselschalter: Seite des gemeinsamen Anschlusses */
  dir?: Side;
  /** Wechselschalter: aktive Stellung 0 oder 1 */
  pos?: 0 | 1;
  /** Gekoppelte Wechselschalter (Kreuzschalter) tragen dieselbe link-ID */
  link?: string;
  /** Schalter/Taster: leitet gerade */
  closed?: boolean;
  /** Öffner (Ruhekontakt): `closed` heißt weiterhin „leitet“ */
  nc?: boolean;
  /** Sicherung: ausgelöst, bleibt bis zum Antippen offen */
  open?: boolean;
  /** Quelle/LED: umgepolt */
  rev?: boolean;
  /** Quelle darf im Level umgepolt werden */
  flip?: boolean;
  /** Vom Spieler gesetzt (nicht vom Level vorgegeben) */
  user?: boolean;
  /** Verbraucher: soll am Ende leuchten/laufen ("on") oder aus bleiben ("off") */
  goal?: "on" | "off";
  /** Schalter/Taster in Warnfarbe (Not-Aus) */
  danger?: boolean;
  /** Beschriftung unter dem Bauteil (überschreibt die Standardbeschriftung) */
  name?: string;
  /* Bauteilwerte, überschreiben `DEF` in engine/parts.ts */
  r?: number;
  u?: number;
  ri?: number;
  un?: number;
  in?: number;
  vf?: number;
  rs?: number;
  imax?: number;
  imin?: number;
  values?: number[];
}

export interface Part extends PartProps {
  type: PartType;
  x: number;
  y: number;
}

export interface Wire {
  /** Vom Level fest verlegt: im Level nicht löschbar */
  lock?: boolean;
}

/** Bauteile auf Rasterpunkten und Leitungen als Kanten dazwischen. Verbunden ist nur,
    was als Kante existiert – Nachbarschaft allein verbindet nichts. */
export interface Circuit {
  parts: Record<PartId, Part>;
  wires: Record<WireKey, Wire>;
}

/** Das Brett, auf dem eine Schaltung liegt: Größe in Punkten und gesperrte Punkte. */
export interface BoardSpec {
  W: number;
  H: number;
  walls?: readonly PointKey[];
}

/* ---------- Simulationsergebnis ---------- */

export interface WireFlow {
  /** liegt auf einem Strompfad zwischen + und − einer aktiven Quelle */
  live: boolean;
  /** technische Stromrichtung: +1 vom ersten zum zweiten Punkt des Schlüssels, −1 umgekehrt */
  dir: -1 | 0 | 1;
}

/** Leitungsknoten: ein Punkt ohne Bauteil, an dem Leitungen enden. */
export interface PointState {
  /** angeschlossene Leitungen (≥3 = Knotenpunkt, 1 = loses Ende) */
  deg: number;
  live: boolean;
}

export interface SimResult {
  hasBattery: boolean;
  /** Es fließt Strom in einem geschlossenen Kreis */
  closed: boolean;
  short: boolean;
  /** Summe der Quellenströme / Spannung der ersten Quelle */
  ibatt: number;
  ubatt: number;
  wires: Record<WireKey, WireFlow>;
  points: Record<PointKey, PointState>;
  /** Kreuzungen: welche ihrer beiden Bahnen Strom führt */
  crossLive: Record<PartId, { h: boolean; v: boolean }>;
  /** Bauteile, die auf einem Strompfad liegen */
  glow: Set<PartId>;
  /** Verbraucher, die leuchten/laufen/summen */
  lit: Set<PartId>;
  /** Helligkeit 0–1 je Lampe */
  bright: Record<PartId, number>;
  /** Strom [A] durch Bauteile (bei Quellen: gelieferter Strom) */
  cur: Record<PartId, number>;
  /** Spannung [V] an Bauteilen */
  volt: Record<PartId, number>;
  tripped: Set<PartId>;
  overload: Set<PartId>;
  /** LEDs in Sperrrichtung */
  blocked: Set<PartId>;
}

/* ---------- Ziele und Prüfung ---------- */

export type LogicExpr = "and" | "or" | "xor" | "id" | "not";

export type Goal =
  | { k: "on"; at?: PartId; ats?: PartId[]; on?: boolean; type?: PartType; label?: string }
  | { k: "wired"; at?: PartId; ats?: PartId[]; label?: string }
  | { k: "read"; at?: PartId; type?: PartType; min: number; max: number; label: string }
  | {
      k: "logic";
      at: PartId;
      expr: LogicExpr;
      /** Schalter-IDs; ein vorangestelltes „!“ kehrt den Eingang um */
      inputs: string[];
      /** zusätzlich muss die Schaltung gerade wirklich durchgeschaltet sein */
      live?: boolean;
      label: string;
    }
  | { k: "toggle"; at: PartId; inputs: PartId[]; label: string }
  | { k: "state"; pressed: Record<PartId, boolean>; label: string }
  | { k: "seen"; label: string }
  | { k: "fuse"; label?: string };

export interface CheckItem {
  /** Text der Checkliste */
  t: string;
  ok: boolean;
}

export interface CheckResult {
  items: CheckItem[];
  won: boolean;
}

/* ---------- Level ---------- */

/** Werkzeuge der Palette: Bauteiltypen plus "wire", "opener" (Schalter mit nc) und "erase". */
export type ToolId = PartType | "wire" | "opener" | "erase";

export type LevelId = string;
export type ChapterId = string;
/** Fachliche Kompetenz, die ein Level übt – Grundlage für die spätere Bewertung. */
export type ConceptId = string;

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Namen der Einblendungen, die Level aufrufen dürfen (siehe features/tutorial). */
export type TutorialId = "drawWire" | "tapSwitch";

/** Ein Kontakt der Funktionsansicht samt der Lampe, die er schaltet. */
export interface ContactLabContact {
  contact: PartId;
  lamp: PartId;
}

export interface LevelDef {
  /** Stabile Kennung. Fortschritt, Bewertung und API beziehen sich nur darauf, nie auf die Position. */
  id: LevelId;
  name: string;
  /** Spielfeldgröße in Punkten */
  W: number;
  H: number;
  /** Gesperrte Punkte: dort liegt nichts, dort führt keine Leitung hin */
  walls?: PointKey[];
  /** Zulässige Werkzeuge */
  palette: ToolId[];
  /** Aufgabentext unter dem Leveltitel */
  task: string;
  /** Merksatz nach dem Lösen */
  lesson: string;
  /** Vorgegebene Schaltung (Startzustand und „Zurücksetzen“) */
  circuit: Circuit;
  /** Explizite Ziele; Verbraucher ohne Eintrag bekommen automatisch eines (deriveGoals) */
  goals?: Goal[];
  /** Geübte Kompetenzen */
  concepts?: ConceptId[];
  /** Gestaffelte Tipps, vom leichtesten zum deutlichsten. Noch nicht in der Oberfläche. */
  tips?: string[];
  /** Musterlösung. Noch nicht in der Oberfläche. */
  solution?: Circuit;
  /** Messwerte und Werte an den Bauteilen beschriften */
  showValues?: boolean;
  /** Schalter immer mit „Schließer“/„Öffner“ beschriften */
  labelSwitches?: boolean;
  /** Gestrichelte Geräterahmen (reine Anzeige) */
  frames?: Frame[];
  /** Merker: das Ziel „seen“ ist erfüllt, sobald diese Verbraucher je gemeinsam liefen */
  latch?: { lit: PartId[] };
  /** Einführende Animation */
  tutorial?: TutorialId;
  /* Zusatzbausteine der Oberfläche (features/widgets) */
  /** Rechenhilfe zum Ohmschen Gesetz; rechnet mit dem Wert dieses Widerstands */
  ohmLab?: { resistor: PartId };
  /** Funktionsansicht eines Schließers und eines Öffners */
  contactLab?: { closer: ContactLabContact; opener: ContactLabContact };
  switchOrientation?: boolean;
}

export interface ChapterDef {
  id: ChapterId;
  name: string;
  levelIds: LevelId[];
}

/** Ein Level in seiner Kapitelzuordnung, so wie die Oberfläche es braucht. */
export interface ResolvedLevel extends LevelDef {
  /** Index des Kapitels in der Reihenfolge des Lehrplans */
  chapterIndex: number;
  chapterId: ChapterId;
}

/* ---------- Lehrplan ---------- */

export interface Curriculum {
  chapters: ChapterDef[];
}
