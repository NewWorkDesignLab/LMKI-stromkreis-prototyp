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
  /** Widerstand: Wert frei eintragbar (in Ω, Grenzen eingeschlossen) statt `values` weiterzuschalten */
  range?: { min: number; max: number };
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
/** Höchstzahl selbst gesetzter Bauteile je Werkzeug (Bauschritt `stock`). */
export type Stock = Partial<Record<ToolId, number>>;

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
  /** Messaufgabe: Lernende bauen das Messgerät so ein, dass es die Größe an `of` misst, und
      tragen den abgelesenen Wert selbst ein. Der Sollwert ist der, den das Messgerät in der
      Simulation zeigt – keine zweite Zahl in den Leveldaten. */
  | {
      k: "measure";
      id: string;
      quantity: Quantity;
      of: PartId;
      /** Einheit der Eingabe; passt zur Messgröße (A/mA bzw. V/mV). Gerechnet wird nicht
          um: wer mA verlangt, bekommt mA. */
      unit: MeasureUnit;
      label: string;
    }
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
  | { k: "fuse"; label?: string }
  /** Ausprobieren: jeder Taster in `ats` wurde einmal betätigt und wieder losgelassen.
      Zählt erst, wenn alle übrigen Ziele erreicht sind – erst bauen, dann ausprobieren. */
  | { k: "tried"; ats: PartId[]; label: string };

/** Messgröße einer Messaufgabe: Strom durch ein Bauteil (Amperemeter) oder Spannung an ihm (Voltmeter). */
export type Quantity = "current" | "voltage";

export type MeasureUnit = "A" | "mA" | "V" | "mV";

/** Eingetragene Messwerte je Messaufgabe (`measure.id`), als getippter Text. */
export type Readings = Record<string, string>;

/** Fortschritt der Ausprobieren-Ziele je Taster: 1 = gerade betätigt, 2 = betätigt und
    wieder losgelassen. Fehlt ein Taster, ist er noch nicht angefasst. */
export type Tried = Readonly<Record<PartId, 1 | 2>>;

export interface CheckItem {
  /** Text der Checkliste */
  t: string;
  ok: boolean;
  /** Messaufgabe: hier trägt man den abgelesenen Wert ein */
  measure?: { id: string; unit: MeasureUnit };
  /** Ausprobieren-Ziel: zählt erst nach den übrigen und verweist auf die Anschauung */
  tried?: true;
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

/* ---------- Inhalte: Textbausteine ---------- */

/** Eingebaute, interaktive oder gezeichnete Anschauungen (features/lesson/widgets). */
export type WidgetId = "uri-dreieck" | "kuehlschrank" | "lichtschalter";

/* Text als strukturierte Bausteine statt HTML oder Markdown: Level können über die API
   von außen kommen; Bausteine lassen sich prüfen und können nichts einschleusen. */
export type Block =
  | { k: "p"; text: string }
  | { k: "list"; items: string[] }
  /** Formel im Tafelsatz (Formelzeichen kursiv, „R_ges“ mit Index) */
  | { k: "formula"; text: string }
  /** hervorgehobener Hinweis */
  | { k: "note"; text: string }
  | { k: "image"; src: string; alt: string; caption?: string }
  /** Video als Verweis; ein eigener Player kommt später */
  | { k: "video"; src: string; title: string }
  | { k: "widget"; widget: WidgetId; caption?: string }
  /** Die Musterlösung eines Bauschritts als blasse, nicht bedienbare Skizze: zeigt, worauf
      sich eine Rechnung bezieht, ohne Messwerte zu verraten (Ruhebild). `labels` ersetzt die
      Beschriftung je Bauteil, `wanted` hebt das Gesuchte hervor, `path` ist der Rechenweg,
      der Schritt für Schritt Bauteile hervorhebt. */
  | {
      k: "ghost";
      step: StepId;
      labels: Record<PartId, string>;
      wanted?: PartId;
      path?: GhostStep[];
    };

/** Ein Schritt im Rechenweg an der Ghost-Schaltung. */
export interface GhostStep {
  /** hervorgehobene Bauteile; die übrigen bleiben blass */
  focus: PartId[];
  text?: string;
  formulas: string[];
}

/* ---------- Schritte ---------- */

export type StepId = string;

interface StepBase {
  /** Stabile Kennung innerhalb des Levels (Slug) */
  id: StepId;
  /** Beschriftung in der Schrittleiste; sonst der Standardname der Art */
  title?: string;
  /** Geübte Kompetenzen, falls sie von denen des Levels abweichen */
  concepts?: ConceptId[];
}

/** Realitätsbezug oder Erklärung vor dem Tun. */
export interface ContextStep extends StepBase {
  kind: "context";
  heading?: string;
  blocks: Block[];
}

export interface Choice {
  id: string;
  text: string;
}

/** Vorhersage: wird nur festgehalten, nicht bewertet – aufgelöst im Merksatz (`recall`). */
export interface PredictStep extends StepBase {
  kind: "predict";
  question: string;
  blocks?: Block[];
  choices: Choice[];
  /** Was tatsächlich passiert; für den Vergleich im Merksatz und die Auswertung */
  correct?: string;
}

/** Bauen am Brett: alles, was früher ein ganzes Level war. */
export interface BuildStep extends StepBase {
  kind: "build";
  /** Spielfeldgröße in Punkten */
  W: number;
  H: number;
  /** Gesperrte Punkte: dort liegt nichts, dort führt keine Leitung hin */
  walls?: PointKey[];
  /** Zulässige Werkzeuge */
  palette: ToolId[];
  /** Materialvorrat: wie viele Bauteile eines Werkzeugs gesetzt werden dürfen. Fehlt ein
      Werkzeug hier, ist es unbegrenzt. Vorgegebene Bauteile zählen nicht mit. */
  stock?: Stock;
  /** Aufgabentext über dem Brett */
  task: string;
  /** Vorgegebene Schaltung (Startzustand und „Zurücksetzen“) */
  circuit: Circuit;
  /** Explizite Ziele; Verbraucher ohne Eintrag bekommen automatisch eines (deriveGoals) */
  goals?: Goal[];
  /** Gestaffelte Tipps, vom leichtesten zum deutlichsten. Noch nicht in der Oberfläche. */
  tips?: string[];
  /** Musterlösung. Noch nicht in der Oberfläche. */
  solution?: Circuit;
  /** Kennwerte an den Bauteilen beschriften (Nennwerte wie auf dem Sockel); "resistance"
      schreibt in Rechenleveln den Bauteilwiderstand dazu. Betriebswerte (Ströme, anliegende
      Spannungen) zeigen beim Bauen nur Messgeräte. */
  ratings?: "nominal" | "resistance";
  /** Schalter immer mit „Schließer“/„Öffner“ beschriften */
  labelSwitches?: boolean;
  /** Gestrichelte Geräterahmen (reine Anzeige) */
  frames?: Frame[];
  /** Merker: das Ziel „seen“ ist erfüllt, sobald diese Verbraucher je gemeinsam liefen */
  latch?: { lit: PartId[] };
  /** Einführende Animation */
  tutorial?: TutorialId;
  /** Funktionsansicht eines Schließers und eines Öffners unter dem Brett */
  contactLab?: { closer: ContactLabContact; opener: ContactLabContact };
}

/** Erwartete Antwort einer Quizfrage. */
export type AnswerSpec =
  | { k: "choice"; choices: Choice[]; correct: string[] }
  /** Zahl in der Grundeinheit `unit` (A, V, Ω …); Eingaben mit Vorsatz (mA, kΩ) werden umgerechnet */
  | { k: "number"; value: number; unit: string; tolerance?: number };

export interface QuizStep extends StepBase {
  kind: "quiz";
  question: string;
  blocks?: Block[];
  answer: AnswerSpec;
  /** Lösungsweg; erscheint nach dem ersten Versuch, nicht vorher */
  explanation?: Block[];
}

/** Merksatz am Ende, auf Wunsch mit Rückblick auf eine Vorhersage. */
export interface SummaryStep extends StepBase {
  kind: "summary";
  lesson: string;
  blocks?: Block[];
  /** ID eines vorangehenden `predict`-Schritts, dessen Antwort hier aufgelöst wird */
  recall?: StepId;
}

export type Step = ContextStep | PredictStep | BuildStep | QuizStep | SummaryStep;
export type StepKind = Step["kind"];

/** Eingabe der Lernenden zu einer Frage. */
export type AnswerValue = { k: "choice"; ids: string[] } | { k: "number"; text: string };

export interface LevelDef {
  /** Stabile Kennung. Fortschritt, Bewertung und API beziehen sich nur darauf, nie auf die Position. */
  id: LevelId;
  name: string;
  /** Geübte Kompetenzen */
  concepts?: ConceptId[];
  /** Die Schritte in Reihenfolge; ein Level ist gelöst, wenn alle erledigt sind. */
  steps: Step[];
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
