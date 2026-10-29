# Stromkreis — Lernspiel zu Schaltplan-Grundlagen

Kontextdatei für KI-Chats ohne Vorwissen. Beschreibt, was das Projekt ist, wie es
entstanden ist, wie die Simulation funktioniert und woran man beim Weiterbauen denken muss.

---

## 1. Was es ist

Ein browserbasiertes Lernspiel auf einem Raster. Man zieht Leitungen zwischen vorgegebenen
Bauteilen und baut so Stromkreise. Jedes Level hat ein Ziel (z. B. „die Lampe leuchtet",
„das Amperemeter zeigt 30 mA") und einen Merksatz, der nach dem Lösen erscheint.

- **Zielgruppe:** Sek II / Ausbildung. Zahlen und Messgrößen sind erwünscht, bis Ohmsches Gesetz.
- **Sprache:** durchgehend Deutsch, auch im Code (Kommentare) und in Commit-Nachrichten.
- **Umfang:** 24 Level in 5 Kapiteln, dazu ein Testkapitel mit 5 noch nicht
  einsortierten Leveln und ein freier Baumodus.

## 2. Woher es kommt

Der Ursprung war ein Claude-Artefakt: eine einzelne `.tsx`-Datei mit 5 Leveln und einer
rein **topologischen** Simulation — sie kannte nur „Strom fließt" oder „fließt nicht".

Bei der Erweiterung fiel auf, dass dieses Modell zwei Dinge nicht abbilden kann:

- **Kurzschluss.** Eine mit einer Leitung überbrückte Lampe leuchtete weiter, weil das
  Modell nur Erreichbarkeit prüfte, nicht Widerstände.
- **Größen.** Ohne Spannung, Strom und Widerstand sind Reihen- und Parallelschaltung nur
  qualitativ lehrbar (UND/ODER), aber nicht Spannungsteilung, Stromteilung, Helligkeit,
  Ohmsches Gesetz oder Messgeräte.

Die Entscheidung war deshalb **beides**: das topologische Modell bleibt (es treibt Glühen und
Flussanimation), darunter liegt zusätzlich ein echter Gleichstrom-Löser. Bewusst _kein_
SPICE-Nachbau — nur so viel Physik, wie die Lernziele brauchen.

## 3. Projektaufbau

```
src/
  domain/types.ts       alle Fachtypen: Circuit, Part, Wire, LevelDef, Step, Block, Goal, SimResult …
  engine/               Physik und Spielregeln, reines TypeScript, kein React
    circuit.ts          Punkte, Leitungsschlüssel, Bauteil-IDs (siehe Abschnitt 5)
    parts.ts            Bauteilwerte (DEF), Anschlüsse, Knotennamen
    simulate.ts         Gleichstrom-Löser + Erreichbarkeit (siehe Abschnitt 4)
    goals.ts            Ziele ableiten und prüfen (checkLevel)
    editing.ts          Bearbeitungsbefehle als reine Funktionen (verbinden, setzen, löschen, antippen)
    history.ts          Verlauf für Rückgängig/Wiederholen
    lesson.ts           Ablauf der Schritte eines Levels, Auswertung von Antworten
    quantity.ts         Zahleneingaben mit Einheit („29 mA“, „0,22 kΩ“)
    format.ts           Zahlenformat (de)
  content/              Inhalte als Daten
    levels/*.ts         die Level, nach Herkunftskapitel abgelegt (noch im Altformat)
    legacy.ts           Übersetzer des Altformats (Zellraster) ins heutige Modell
    catalog.ts          ALLE Level; curriculum.ts: welche davon in welcher Reihenfolge
    concepts.ts         Kompetenzen, die Level üben (Grundlage der Bewertung)
    tutorials.ts, legend.ts, sandbox.ts, helpers.ts
  services/             Anwendungslogik ohne React
    content.ts          ContentService: Level/Kapitel zur Laufzeit, Texte überschreibbar
    progress.ts         ProgressStore (Interface + Speicher im RAM)
    assessment.ts       Bewertung: Ereignisse → Profil je Kompetenz
    sequencer.ts        welches Level als nächstes (Standard: linear)
    attempts.ts         Versuchs-Richtlinie (Platzhalter, noch ohne Wirkung)
    settings.ts         Einstellungen (Ziehhilfe, Ton, Flussanimation, Debug) + SettingsStore
    validate.ts         validateLevel – Prüfung für von außen kommende Level
    events.ts, store.ts
  app/
    runtime.ts          Wurzel: hält Inhalt, Fortschritt, Bewertung, Sitzungszustand
    RuntimeContext.tsx  React-Anbindung (useRuntimeState …)
    App.tsx             Kopfzeile, Levelwahl, Overlays
  api/                  Schnittstelle für Fremdsteuerung (KI), window.stromkreis
  theme/                Farbtokens als CSS-Variablen, Themen
  render/               SVG: Board.tsx, symbols/ (ein Bauteil je Datei), viewport.ts (Zoom-Rechnung)
  features/
    lesson/             Level als Schrittfolge: Schrittleiste, Darstellung je Schrittart, Textbausteine
    play/               Bauschritt: PartDrawer (PartPalette) | Aufgabe, Brett (BoardViewport), Zustand, Ziele (BuildPanels)
    settings/           Einstellungsdialog
    tutorial/           Einführungsanimationen
    widgets/            Anschauungen (URI-Dreieck, Kühlschrank, Lichtschalter) und Funktionsansicht
  ui/                   allgemeine Bausteine (Overlay, Toggle, LevelPicker, Werkzeuganzeige)
  styles/index.css      Tailwind + Animationen
index.html, vite.config.ts, tailwind.config.js, tsconfig.json
```

```bash
npm install && npm run dev       # Entwicklung, Port 5180
npm run typecheck                # tsc
npm run build                    # typecheck + Produktions-Build nach dist/
npm test                         # vitest: Engine, Inhalte, API
```

Abhängigkeitsrichtung: `domain` ← `engine` ← `content`/`services` ← `app`/`api` ← Oberfläche
(`features`, `ui`, `render`). Die Engine kennt weder React noch Inhalte. Die Oberfläche greift
nur über `Runtime` auf Fortschritt und Inhalt zu, nie auf Dateien in `content/` direkt (außer
Legende, Sandbox und Tutorial-Daten).

Tailwind läuft als echter Build (v3, PostCSS), nicht mehr über das Play-CDN.
TypeScript ist bewusst **nicht strikt** (`strict: false`, `strictNullChecks: false`): die Engine
stammt aus dem Prototyp und ist nur an den Schnittstellen typisiert. Die Typen in
`domain/types.ts` und alles in `services/`, `api/` sind dagegen sauber; Engine-Dateien können
nach und nach nachgezogen werden.

### Wie man erweitert

- **Neues Level:** im heutigen Format als Schrittfolge schreiben (Vorlage:
  `content/levels/beispiele.ts`), **nicht** im Altformat der Prototyp-Level; stabile `id`
  als Slug, `concepts`. Bauschritten möglichst eine `solution` mitgeben – der Test prüft,
  dass sie die Ziele erreicht. In `catalog.ts` aufnehmen, in `curriculum.ts` einordnen.
  `npm test` prüft IDs, Lehrplan, Konzepte, Verweise, Schritte und Schaltungen.
- **Neue Schrittart:** Typ in `domain/types.ts` (Step), Regeln in `engine/lesson.ts`,
  Prüfung in `services/validate.ts`, Darstellung in `features/lesson/stepViews.tsx`
  (`STEP_VIEWS` – die Typprüfung meldet einen fehlenden Eintrag).
- **Neue Anschauung (Widget):** Komponente in `features/widgets/`, Eintrag in `WidgetId`,
  `features/lesson/Blocks.tsx` und `services/validate.ts`; eingebunden als
  `{ k: "widget", widget: "…" }`.
- **Level-Reihenfolge, Kapitel, Texte, Thema zur Laufzeit:** über die API (siehe unten),
  nicht durch Umbauen der Oberfläche.
- **Neues Bauteil:** `domain/types.ts` (PartType), `engine/parts.ts` + `simulate.ts`,
  `engine/circuit.ts` (ID_PREFIX), Symbol in `render/symbols/`, Eintrag in
  `symbols/index.tsx`, `ui/tools.tsx`, `engine/editing.ts` (PLACEABLE) und
  `services/validate.ts`.
- **Andere Bewertung / Levelauswahl / Versuchsgrenze:** `Assessment`, `LevelSequencer`,
  `AttemptPolicy` austauschen (`createRuntime({ … })`).

### API für Fremdsteuerung (z. B. KI)

`window.stromkreis` (siehe `src/api/types.ts`, `API_VERSION`): Abfragen (`getSnapshot`,
`listLevels`, `getLevel`, `getProfile`, `getEvents`), Befehle als JSON über
`dispatch({ type, … })` — `go_to_level`, `set_level_order`, `set_chapters`, `register_level`
(wird mit `validateLevel` geprüft), `patch_level` (Name und Texte je Schritt, etwa
`{ steps: { bauen: { task }, merksatz: { lesson } } }`), `set_theme`,
`register_theme` — und `subscribe` für Lernereignisse und Zustandsänderungen.
Level werden überall über ihre **ID** angesprochen, nie über die Position.

Lernereignisse (API-Version 2): `level_started`, `board_reset`, `level_solved`, `level_left`,
`step_started`, `step_completed` und `answer_submitted` (Schritt, Antwort, richtig/falsch;
`null` bei einer Vorhersage ohne Auflösung; `confidence` ist für die Sicherheitsabfrage
vorgesehen). Die Bewertung zählt Antworten bei den Konzepten des Schritts, sonst des Levels.

Noch nicht verdrahtet: Versuchsgrenze mit Tipp/Lösung nach n Fehlversuchen (`tips`,
`solution` am Bauschritt und `AttemptPolicy` sind angelegt, die Oberfläche zeigt sie noch
nicht), persistenter Fortschritt (nur `MemoryProgressStore`), serverseitige Anbindung.

## 4. Die Simulation

### Zwei Sichten auf dieselbe Schaltung

**Topologisch** — ein Graph aus Anschlüssen (Ports). Für jedes Leitungsstück wird geprüft,
ob es auf einem Weg vom Plus- zum Minuspol einer aktiven Quelle liegt. Ergebnis: welche
Leitungen glühen und in welche Richtung die Flussanimation läuft.

**Numerisch** — ein Gleichstrom-Löser nach dem Knotenpotentialverfahren. Ergebnis: Ströme,
Spannungen, Helligkeit, Messwerte, Kurzschluss, LED-Polung, Sicherungsauslösung.

Zwei Sichten, weil Leitungszellen im Löser zu einem einzigen Knoten verschmolzen werden —
einzelne Leitungsstücke haben dort also gar keinen eigenen Strom mehr, den man animieren
könnte. Die Topologie liefert genau das.

### Wie der Löser arbeitet

1. **Knoten bilden.** Union-Find verschmilzt alle Anschlüsse, die direkt verbunden sind:
   Leitungskanten, geschlossene Schalter und Taster, der aktive Zweig eines
   Wechselschalters. Ideale Leiter tauchen dadurch gar nicht erst im Gleichungssystem auf.
2. **Stempeln.** Jedes übrige Bauteil wird als Norton-Zweipol eingetragen: Leitwert `g`
   zwischen zwei Knoten plus optionale Stromquelle `i`. Der Strom durch ein Bauteil ist
   immer `I = g·(Ua − Ub) − i`.
3. **Getrennt lösen.** Jeder galvanisch getrennte Teil der Schaltung wird **einzeln**
   gelöst, mit eigenem Bezugsknoten (Gauß-Jordan mit Spaltenpivot). Das ist wichtig:
   Level 22 besteht aus zwei absichtlich getrennten Kreisen, und ein Bauteil ohne
   geschlossenen Weg muss 0 A führen.
4. **Iterieren.** LEDs sperren gegen die Durchlassrichtung, Sicherungen lösen bei Überstrom
   aus. Beides verändert die Schaltung, also wird neu gelöst, bis der Zustand stabil ist
   (maximal 12 Durchläufe).

### Warum die Quelle einen Innenwiderstand hat

`ri = 0,5 Ω`. Ohne ihn wäre ein Kurzschluss eine Division durch null bzw. ein singuläres
Gleichungssystem. Mit ihm ist er ein endlicher, berechenbarer Strom — 9 V / 0,5 Ω = 18 A —
und lässt sich anzeigen, statt abgefangen werden zu müssen. Ein Kurzschluss gilt als
erkannt, wenn eine Quelle mehr als ihren `imax` (Standard 1 A) liefert.

### Flussrichtung

Die Laufrichtung der Animation ist die **technische** Stromrichtung (Plus nach Minus), nicht
die Elektronenflussrichtung. Sie fällt bei der Erreichbarkeitsprüfung ohnehin an: welches
Ende eines Leitungsstücks vom Plus- und welches vom Minuspol aus erreichbar ist. Stücke, die
gegen den Strom gezeichnet sind, werden beim Rendern umgedreht — die Striche laufen immer
vom Anfang zum Ende der SVG-Linie.

## 5. Datenmodell

Eine Schaltung besteht aus **Bauteilen auf Rasterpunkten** und **Leitungen als Kanten**
zwischen benachbarten Punkten (`domain/types.ts`, Hilfen in `engine/circuit.ts`):

```js
{
  parts: {
    G1: { type: "battery", x: 0, y: 1, orient: "v" },
    E1: { type: "lamp", x: 4, y: 1, orient: "v", goal: "off", user: true, r: 360 },
  },
  wires: { "0,0|1,0": {}, "1,0|2,0": { lock: true } },
}
```

- **Verbunden ist nur, was als Kante existiert.** Nebeneinanderliegen verbindet nichts –
  das war im Prototyp anders und der Grund für „Die Falle“ (Abschnitt 7).
- Eine Kante leitet nur, wenn beide Enden dort einen Anschluss haben; der Editor lässt
  andere gar nicht erst zu. Ein Punkt ohne Bauteil, an dem Kanten enden, ist ein
  Leitungsknoten (≥ 3 Kanten = Knotenpunkt, 1 = loses Ende).
- **IDs** nach Kennbuchstaben (G Quelle, E Lampe, P LED, R Widerstand, M Motor, H Summer,
  F Sicherung, PA/PV Messgeräte, S Schalter, X Kreuzung). Ziele, Widgets, Einführungen und
  API verweisen nur auf IDs, nie auf Punkte.
- Leitungsschlüssel `"x,y|x,y"`, linker bzw. oberer Punkt zuerst (`wireKey`). Lange
  Leitungen sind mehrere Kanten; für Leveldaten gibt es `wires(["0,1 0,0 4,0"])`.
- `lock` an einer Kante: im Level nicht löschbar. `user` am Bauteil: vom Spieler gesetzt,
  nur das darf er im Level löschen und drehen. Beim Frei bauen gehört ihm alles.
- Wände stehen am Level (`walls`), nicht in der Schaltung.
- **Bearbeiten** nur über `engine/editing.ts`. Ein Bauteil lässt sich in eine Leitung
  einsetzen, wenn alle dort endenden Kanten auf seine Anschlüsse treffen. Entfernen nimmt
  die eigenen angeschlossenen Kanten mit (sonst entstünde am leeren Punkt eine Brücke).
  Drehen löst Kanten, die danach ins Leere liefen.
- **Verlauf:** Aufbau-Änderungen (setzen, löschen, verbinden, drehen, Werte, Zurücksetzen)
  kommen in den Verlauf, eine Geste ist ein Eintrag. Bedienung (Schalter, Taster,
  Sicherung) nicht; sie bleibt beim Rückgängigmachen erhalten (`carryOperatingState`).
- **Bedienung am Brett:** Ziehen verbindet Punkt für Punkt, auch von einem Bauteil aus.
  Rechtsklick löscht mit jedem Werkzeug (nah am Punkt: Bauteil bzw. Knoten, sonst die
  Leitung daneben). Strg+Z / Strg+Y, R dreht die Ausrichtung des gewählten Bauteils, W
  oder Esc springt zurück aufs Verdrahten, E wählt Löschen. Bauteile haben bewusst keine
  Tastenkürzel: es gibt mehr Bauteilarten als Zifferntasten, und je Level stünden sie an
  anderer Stelle (entschieden 2026-10-23). Unter dem Zeiger zeigt das Brett, was passieren wird
  (Zielpunkt, Bauteilvorschau grün/rot, rot markierte Löschstelle).
- **Ziehhilfe** (Einstellung, Standard aus): Jeder Punkt, den ein Leitungszug erreicht,
  wird sofort mit allen Bauteilanschlüssen verbunden, die auf ihn zeigen
  (`snapToTerminals`) – auch beim Vorbeiziehen, live während des Zugs. Das fühlt sich an
  wie der Prototyp, gilt aber nur für Bauteilanschlüsse: nebeneinanderliegende Leitungen
  verbinden sich weiterhin nicht. Gehört zur Geste, ein Strg+Z nimmt alles zurück.
  Standard aus, weil „nur verbunden ist, was man verbindet“ die Grundregel des Bretts ist.

### Oberfläche (Desktop)

Ab `lg` (1024 px) füllt die Anwendung das Fenster: Kopfleiste (Modus, Levelnavigation,
Ton, Schaltzeichen, Einstellungen), darunter die Schrittleiste und der aktuelle Schritt.
Entschieden 2026-10-23 nach dem Vergleich mit dem kompakten Prototyp: alles, worauf man
achten muss, liegt in Leserichtung direkt am Brett, nicht in Seitenspalten („Variante B“).
Ergänzt 2026-10-26: Bauteilfach und Ziele stehen ab `xl` unmittelbar neben der Brettspalte
(das Fach klappt bei Bedarf weg), nicht mehr als eigene Rasterspalten am Fensterrand.

**Bauschritt:**

- **links neben dem Brett** `PartDrawer` mit `PartPalette`: ein schmaler, hoher Griff
  (Dreieck, `aria-expanded`), aus dem das Fach nach links aufgeht; es startet offen, wenn die
  Palette Bauteile enthält. Unter `xl` steht es als aufklappbare Leiste über dem Brett.
  Bauteile als Karten nach Gruppen (Quellen, Schalten, Verbraucher, Begrenzen & Schützen,
  Messen, Leitungen), Symbol auf getöntem Grund, Vorrat als „1×“-Marke, darunter die
  Kurzinfo nur als Tooltip (nichts erscheint beim Überfahren, sonst ändert sich die Höhe
  der Liste). **Farbe nur in der Palette**
  – auf dem Brett bleiben die Schaltzeichen normgerecht schwarz (entschieden 2026-10-23).
- **rechts neben dem Brett** `GoalList`: die Ziele untereinander, bei Messaufgaben mit Feld
  für den abgelesenen Wert; unter `xl` unter dem Brett.
- **Mitte** eine Spalte, so breit wie das Brett (mindestens 40 rem, damit die Aufgabe
  nicht in kurze Zeilen bricht), ab `xl` in der Fenstermitte:
  - `TaskBar`: die Aufgabe.
  - `BoardViewport`: Im Level ist der Rahmen **so groß wie das Brett** in Originalgröße
    (100 % = 60 px je Punkt, wie im Prototyp) plus Rand – ein kleines Level bleibt klein und
    mittig. Zoom und Verschieben erscheinen nur, wenn das Brett nicht hineinpasst (dann bis
    70 % verkleinert, `MIN_START_SCALE`, der Rest wird verschoben) und im freien Bauen, wo
    der Rahmen die Fläche füllt. Mausrad zoomt um den Zeiger, Leertaste oder mittlere
    Maustaste verschiebt. Oben links schwebt die `ToolBar` mit Verdrahten (W), Löschen (E)
    und Drehen (R), die Kürzel sichtbar im Knopf (entschieden 2026-10-23: vorher stand das
    links in der Palette, bei normal breiten Brettern weit weg vom Brett). Sie hat ein
    eigenes Band über dem Brett (`TOOLBAR_BAND`), damit sie nie einen Punkt verdeckt.
  - `StatusBar`: was die Schaltung tut, daneben Rückgängig, Wiederholen, Zurücksetzen
    (Frei bauen: Leeren).
  - `WinPanel` nach dem Lösen, unter den Zielen in der rechten Spalte: „Geschafft“ und
    „Weiter“. Der Merksatz steht bewusst nicht hier, sondern im nächsten Schritt.
  - Zusatzbausteine wie die Funktionsansicht stehen darunter; dann scrollt die Spalte.

**Übrige Schritte im Querformat** (`features/lesson/Stage.tsx`): links eine Bühne, rechts der
Text. Auf der Bühne steht die erste Anschauung (Widget, Bild) aus den Bausteinen des
Schritts, sonst die Schaltung des Levels zum Ansehen – mit Simulation, ohne Bedienung.
Welche Schaltung, regelt `stageOf` (engine/lesson): nach dem Bauen die **eigene gelöste
Schaltung** (bei mehreren Lösungen sieht man, was man selbst gebaut hat), ohne sie die
Musterlösung, vor dem Bauen nur der Ausgangsaufbau (die Lösung vorab nähme das Bauen
vorweg). Der Merksatz zeigt immer die Schaltung; Schalter, Taster und Wechselschalter lassen
sich dort bedienen (`useOperableBoard`), alles Übrige bleibt Ansicht, und der Zustand
bleibt in dieser Ansicht. Ein Einstieg ohne Anschauung bleibt eine
schmale Textspalte.

**Moment des Lösens:** Der Brettrahmen leuchtet einmal grün auf, erreichte Ziele haken
sich mit einem kurzen Ploppen ab, „Geschafft“ gleitet unter dem Brett herein – bewusst
einmalig und leise. Bei „Bewegung reduzieren“ (Systemeinstellung) bleibt nur der
Farbwechsel. Später hängt sich hier der Ton an (Phase 6).

**Aufgabe beim Start** (`useTaskIntro`, Einstellung, Standard an): Beim ersten Betreten eines
Bauschritts ist die Aufgabenleiste an ihrem Platz leicht herausgehoben, und nur der
Aufgabentext ist zu sehen – erst lesen, was zu tun ist. Das Brett bleibt frei sichtbar,
weil manche Aufgaben („Der Kurzschluss“) erst mit Blick auf die Schaltung verständlich
sind. Nach 7 Sekunden oder bei der ersten Eingabe setzt sich die Leiste, und die Ziele
erscheinen nacheinander. Beim Zurückblättern kommt das nicht wieder.

Unter `lg` steht alles vorläufig untereinander.

**Einstellungen** (`services/settings.ts`): Ziehhilfe, Flussanimation, Aufgabe beim Start
hervorheben, Ton und Lautstärke
(die Töne selbst fehlen noch, Phase 6). Der Schalter „Debug“ zeigt im Bauschritt eine
Debug-Anzeige (`DebugPanel`), sofern der Aufrufer von `PlayArea` Zeilen liefert – bisher
tut das niemand, die Stelle ist für künftige Auswertungen vorgesehen. Einstellungen ändern
nie, was als gelöst gilt. Die Runtime
hält sie im Zustand (`settings`, `setSettings`), gespeichert über einen austauschbaren
`SettingsStore` – im Browser `localStorage`. Gespeicherte Werte gelten als Fremddaten:
jedes Feld wird geprüft, was nicht passt, bekommt seinen Standardwert.

Bauteileigenschaften:

- `orient` — `"h"` (Anschlüsse West/Ost) oder `"v"` (Nord/Süd). Zweipole nur.
- `dir` / `pos` — nur Wechselschalter: `dir` ist die Seite des Wurzelanschlusses, die beiden
  Ausgänge liegen senkrecht dazu. `pos` (0/1) wählt den aktiven Ausgang.
- `rev` — dreht die Polung um (LED, Quelle).
- `flip` — erlaubt dem Spieler, `rev` per Antippen zu ändern.
- `values` — Werteliste; Antippen schaltet `r` durch die Liste. Eine Liste mit nur
  einem Wert friert das Bauteil ein (und blendet das ⟳ aus).
- `range` — `{ min, max }` in Ω: der Widerstandswert wird frei eingetragen statt
  weitergeschaltet (Beschriftung mit ✎). Antippen öffnet über dem Brett ein Feld
  (`activate` → `"value"`), übernommen wird mit `setValue` – innerhalb der Grenzen, mit
  Verlaufseintrag. Schließt `values` aus.
- `nc` — macht aus einem `switch` oder `button` einen **Öffner**. Achtung: `closed` heißt auch dort
  „leitet“, nicht „betätigt“ — ein Öffner startet deshalb mit `closed: true`. Dadurch
  bleiben Löser, Zielprüfung und Schalterkombinationen unverändert; `nc` ändert nur
  das Symbol (Querstrich am festen Kontakt) und die Beschriftung.
- `name` — überschreibt die Beschriftung unter der Zelle (z. B. „Not-Aus“, „Schließer“).
- `danger` — zeichnet Umriss und Ruhekontakt rot (Not-Aus).

## 7. Level

| #   | Kapitel / Level                      | Konzept                                               |
| --- | ------------------------------------ | ----------------------------------------------------- |
|     | **Der Stromkreis**                   |                                                       |
| 1   | Schließe den Stromkreis              | geschlossener Stromkreis                              |
| 2   | Der Schalter                         | gewollte Unterbrechung                                |
| 3   | Reihenschaltung = UND                | Reihe, UND-Logik                                      |
| 4   | Parallelschaltung – beide Lampen     | Parallelzweige                                        |
| 5   | Wähle den Stromweg                   | eine Lampe muss aus bleiben                           |
|     | **Kurzschluss & Schutz**             |                                                       |
| 6   | Der Kurzschluss                      | überbrückte Lampe finden und löschen                  |
| 7   | Die Sicherung                        | Überstromschutz                                       |
| 8   | Durchlass- und Sperrrichtung der LED | Durchlass- und Sperrrichtung                          |
| 9   | Der Vorwiderstand                    | R = (Uq − UF) / I                                     |
|     | **Schalter & Logik**                 |                                                       |
| 10  | Der Taster                           | Schließer                                             |
| 11  | Parallelschaltung = ODER             | ODER-Logik                                            |
| 12  | Der Wechselschalter                  | Umschalten statt Ein/Aus                              |
| 13  | Die Wechselschaltung                 | Flurlicht, zwei korrespondierende Leitungen           |
| 14  | Motor und Summer                     | eigener Schalter je Zweig                             |
|     | **Größen & Messen**                  |                                                       |
| 15  | Der Widerstand                       | Strombegrenzung                                       |
| 16  | Amperemeter in Reihe                 | richtige Einbauart                                    |
| 17  | Voltmeter parallel                   | richtige Einbauart                                    |
| 18  | Reihenschaltung teilt die Spannung   | Spannungsteilung                                      |
| 19  | Parallelschaltung teilt den Strom    | Stromteilung                                          |
| 20  | Ohmsches Gesetz                      | R = U / I rechnen                                     |
|     | **Schaltplan lesen**                 |                                                       |
| 21  | Knotenpunkt oder Kreuzung?           | Knotenpunkt verbindet, Kreuzung nicht                 |
| 22  | Am Knotenpunkt teilt sich der Strom  | Knotenregel, Zweig- und Gesamtstrom                   |
| 23  | Anders gezeichnet – UND              | Topologie statt Geometrie                             |
| 24  | Zwei Spannungsquellen in Reihe       | Spannungen addieren sich bei richtiger Polung         |
|     | **Neue Level (Test)**                | _noch nicht einsortiert_                              |
| 25  | Der Dimmer                           | Widerstand in Reihe regelt die Helligkeit             |
| 26  | Fehlersuche: Die Wechselschaltung    | korrespondierende Leitungen gebrückt                  |
| 27  | Das Licht im Schalter                | LED parallel zum Schalter                             |
| 28  | Drücken macht aus?                   | beide Kontaktarten im Vergleich, mit Funktionsansicht |
| 29  | Der Not-Aus                          | Öffner in der Hauptleitung, Reihenfolge erzwungen     |

Kapitel 6 ist eine **Ablage**: die Level liegen hinter den 24 bestehenden, damit sie
sich durchspielen lassen, ohne die vorhandene Reihenfolge zu verschieben. Welches
davon welchen Platz bekommt — und welches bestehende dafür weicht — ist offen.

### Level als Schrittfolge

Ein Level (`LevelDef`) ist `{ id, name, concepts, steps }`. Die Schritte erscheinen
nacheinander; eine **Schrittleiste** zeigt, wo man steht. Erledigte Schritte lassen sich
wieder öffnen, spätere erst, wenn der Weg dorthin frei ist (war das Level schon einmal
gelöst, ist alles offen). Gelöst ist ein Level, wenn alle Schritte erledigt sind.

| Art       | Inhalt                                                                            | erledigt, wenn …          |
| --------- | --------------------------------------------------------------------------------- | ------------------------- |
| `context` | Realitätsbezug/Erklärung aus Textbausteinen                                       | „Weiter“                  |
| `predict` | Vorhersage mit Auswahl; festgehalten, nicht bewertet, danach unveränderlich       | eine Antwort festgehalten |
| `build`   | das Brett (alles, was früher ein ganzes Level war)                                | die Ziele erreicht sind   |
| `quiz`    | Auswahl (auch mehrere richtige) oder Zahl mit Einheit und Toleranz (Standard 2 %) | richtig beantwortet       |
| `summary` | Rückblick: eigene Schaltung mit richtigen Messungen (`measuredResults`), Aufgabe, Merksatz, `recall` löst eine Vorhersage auf, `blocks` erklären | „Weiter“ |

- **Textbausteine statt HTML/Markdown** (`Block`: `p`, `list`, `formula`, `note`, `image`,
  `video`, `widget`, `ghost`). Level können über die API von außen kommen; Bausteine lassen sich
  prüfen, Bilder und Videos nur über http(s) oder relative Pfade.
- **Ghost-Schaltung** (`{ k: "ghost", step, labels, wanted?, path? }`): zeichnet die
  `solution` eines Bauschritts desselben Levels als blasse, grau-blaue Skizze, nicht
  bedienbar und im Ruhebild (`idleSim`: ohne Quelle gerechnet, damit kein Messwert die
  Lösung verrät). `labels` ersetzt die Beschriftung je Bauteil („R_V = ?“), `wanted` hebt
  das Gesuchte hervor. `path` ist ein Rechenweg in Schritten (`focus`, `text`, `formulas`),
  der beim Blättern die gemeinten Bauteile hervorhebt; er wird wie `quiz.explanation` erst
  nach dem ersten Versuch frei und ersetzt sie dann. Der Ghost steht als Anschauung auf der
  Bühne. Er zeigt, worauf sich eine Rechnung bezieht – bei „Ohmsches Gesetz“, dass nach dem
  Vorwiderstand gefragt ist und nicht nach dem Gesamtwiderstand.
- **Lösungsweg erst nach dem ersten Versuch** (`quiz.explanation`): wer ihn vorher liest,
  rechnet nicht mehr selbst. Ungültige Eingaben (keine Zahl, falsche Einheit) zählen nicht
  als Versuch.
- Zahleneingaben verstehen Komma und Vorsätze: „29 mA“, „0,22 kΩ“, „220 Ohm“, „0,22k“.
- Verborgene Schritte bleiben eingehängt: ein halb verdrahtetes Brett übersteht das
  Zurückblättern. Tastenkürzel (Strg+Z) wirken nur auf das sichtbare Brett.
- Der Merksatz-Schritt hat zwei Spalten. Links steht die Aufgabe als dünne Zeile ohne
  Überschrift, darunter die eigene Schaltung (bedienbar) und was man richtig gemessen hat
  („Stromstärke: 47 mA“, so wie das Messgerät es zeigt). Rechts steht ein Panel: _Merke_, die
  Vermutung, dann _Warum das so ist_ aus `blocks`. Eine Zielliste gibt es dort bewusst nicht –
  was erreicht ist, zeigt die Schaltung, und lange Erklärungen verlängern nur die rechte
  Spalte. Im Altformat steht diese Erklärung in `explanation`; bisher haben sie
  die Level in `levels/messen.ts`, die übrigen folgen.
- Die Prototyp-Level werden zu „Bauen“ + „Merksatz“ übersetzt; `before` stellt Schritte im
  heutigen Format davor. So zeigen „Das Licht im Schalter“ und „Der Öffner“ ihren
  Alltagsbezug als ersten Schritt statt hinter einem „?“.
- „Ohmsches Gesetz“ liegt im heutigen Format (`levels/rechnen.ts`): Rechnen ist die
  Hauptleistung (Ghost-Schaltung, Feld mit `tolerance: 0`), Bauen die Probe mit frei
  eingetragenem Vorwiderstand. Die Werte gehen glatt auf (9 V, 90 Ω, 25 mA → 270 Ω, ein
  E12-Normwert), damit das Level das Ohmsche Gesetz lehrt und nicht das Runden.
- Toleranz 0 heißt „genau dieser Wert“, gleich in welcher Schreibweise („270“, „0,27 kΩ“);
  verglichen wird auf 12 Stellen (`exact`), wie beim Messwert.

### Bauschritt

Ein Bauschritt hat Feldgröße, Startschaltung, Werkzeugpalette, Aufgabe (`task`) und optionale
Ziele.

**Kennwerte am Bauteil, Betriebswerte nur am Messgerät** (entschieden 2026-10-28):
- **Beschriftung beim Bauen:** `ratings: "nominal"` schreibt Kennwerte an die Bauteile,
  wie auf Sockel oder Typenschild (`ratingLines` in `engine/format.ts`): Spannungsquelle „9 V“,
  Lampe „9 V / 100 mA“, LED „2 V / 15 mA“.
- **Rechenlevel:** `"resistance"` ergänzt dort den Bauteilwiderstand („90 Ω“), also in
  „Der Widerstand“, „Ohmsches Gesetz“ und „Die Lichterkette“.
- **Betriebswerte:** Ströme und anliegende Spannungen zeigen beim Bauen nur Amperemeter und
  Voltmeter. Die Statusleiste meldet nur den Zustand („Strom fließt“), weil der Gesamtstrom
  der Quelle sonst jede Messaufgabe vorwegnähme.
- **Merksatz und Frei bauen:** Erst der Merksatz zeigt alle Betriebswerte (Board `live`),
  und nur in Leveln mit `ratings`: dort ist die Schaltung Auswertung. Frei bauen zeigt sie immer.
- **Kennwert und Messwert:** Kennwerte stehen grau und klein wie ein Aufdruck unter dem
  Bauteil, Mess- und Betriebswerte kräftig in Tinte. Im Merksatz ersetzt der Betriebswert das
  Typenschild.

`showValues` gibt es nicht mehr; die Prüfung meldet es. `labelSwitches: true` schreibt
unter jeden Kontakt „Schließer“ bzw. „Öffner“ (im freien Baumodus an, weil dort der
Öffner in der Palette liegt). `latch` siehe Zielsystem.

`stock: { ammeter: 1 }` begrenzt das **Material**: so viele Teile dieses Werkzeugs dürfen
gesetzt werden; Werkzeuge ohne Eintrag sind unbegrenzt, vorgegebene Bauteile zählen nicht
mit, gelöschte gibt es zurück. Die Regel steht in `engine/editing.ts` (`remaining`,
`canPlace`), die Palette zeigt „1×“ auf der Kachel. Heute nutzen ihn die Messgeräte-Level
und „Knotenpunkt oder Kreuzung?“ (vier Kreuzungen); für schwerere Level ist er der Hebel,
die Lösung über das Material einzugrenzen. Im freien Bauen gibt es keinen Vorrat.

`contactLab: { closer: {contact, lamp}, opener: {contact, lamp} }` blendet unter dem Brett die **Funktionsansicht** ein: zwei
aufgeschnittene Taster, in denen Stößel und Kontaktbrücke sich mitbewegen, dazu eine
Schrittfolge, die zum Ausprobieren beider Kontakte auffordert. Sie zeigt den
_Mechanismus_, den der Schaltplan grundsätzlich nicht zeigen kann — bewusst **neben**
dem Brett und als „vereinfachte Funktionsansicht“ beschriftet, damit die Schaltplan-
Sprache auf dem Brett unberührt bleibt. Das Muster taugt auch für den Wechselschalter
oder später ein Relais.

Die Schrittfolge ist **reihenfolgefrei**: je Taster merkt sich `lab` 0 (unberührt),
1 (gedrückt) und 2 (gedrückt und wieder losgelassen); gelöst ist das Level, wenn beide
auf 2 stehen. Dass es diese Zusatzbedingung gibt, steht im Aufgabentext, nicht in der
Zielliste — die Ziele bleiben die Verdrahtung.

Welche Taster und Lampen gemeint sind, steht im Bauschritt, nicht im Bauteil-Code.
`frames` zeichnet gestrichelte
**Gerätegrenzen** (Rechtecke in Feldkoordinaten) — die Konvention „das ist ein Bauteil“
aus dem Installationsplan, reines Dekor ohne Wirkung auf die Simulation. Level 27 fasst
damit Schalter und Orientierungslicht zu einem Gerät zusammen.

### Level bauen: die Falle (nur Altformat)

Gilt nur noch für die Prototyp-Level im Altformat (`content/legacy.ts`), deren
Zellraster beim Laden nach dieser Regel in Kanten übersetzt wird. Im heutigen Modell
gibt es die Falle nicht mehr.

**Zwei benachbarte Zellen mit Anschlüssen sind elektrisch verbunden — immer.** Eine
Rückleitung, die neben einem Abzweig verläuft, schließt ihn kurz. Level 12 war deshalb
anfangs _unlösbar_: jeder mögliche Weg der Rückleitung berührte eine Stichleitung.

Beim Entwerfen also für jede Zelle der geplanten Lösung alle vier Nachbarn prüfen und
Wände (`wall`) gezielt setzen. Faustregel: Abzweige so kurz wie möglich halten — im
korrigierten Level 12 sitzen die Lampen direkt an den Ausgängen des Wechselschalters,
dadurch gibt es keine Stichleitungen, die einen Korridor blockieren.

## 8. Zielsystem

Ziele stehen pro Level in `goals`; für Verbraucher ohne eigenes Ziel wird automatisch
„leuchtet" bzw. „bleibt aus" ergänzt (gleichartige werden zu einer Zeile zusammengefasst).

| Art      | Bedeutung                                                                     |
| -------- | ----------------------------------------------------------------------------- |
| `on`     | Verbraucher an / aus                                                          |
| `read`   | Messgerät zeigt einen Wert im Bereich `min`–`max` (Aufbau-Ziel, kein Ablesen) |
| `measure`| Messaufgabe: Größe an `of` messen, abgelesenen Wert eintragen                 |
| `logic`  | Lampe folgt `and` / `or` / `xor` / `id` / `not` über die genannten Schalter   |
| `toggle` | jeder einzelne Schalter kehrt den Zustand um (Wechselschaltung)               |
| `state`  | die genannten Kontakte sind **jetzt** betätigt bzw. nicht betätigt            |
| `seen`   | die in `latch` genannten Verbraucher liefen im Verlauf schon einmal gemeinsam |
| `fuse`   | die Sicherung hält                                                            |

`logic` und `toggle` **simulieren alle Schalterkombinationen durch**, nicht nur den aktuellen
Zustand. Dadurch wird wirklich die Verdrahtung geprüft.

Ihre Eingänge bedeuten dabei **„betätigt“, nicht „leitet“** — beim Öffner ist das
gegenläufig. Ein vorangestelltes `!` dreht einen Eingang um: `inputs: ["!S1", "S2"]`
heißt „Not-Aus nicht gedrückt UND Schalter zu“. Bei gewöhnlichen Kontakten fallen beide
Lesarten zusammen, dort ändert das nichts.

`state` und `seen` gibt es, weil manche Aufgaben eine **Reihenfolge** verlangen. Level 29
ließe sich sonst lösen, indem man erst den Not-Aus drückt und dann die Schalter umlegt —
die Anlage hätte nie gelaufen. `latch: { lit: [...] }` am Level merkt sich, dass die
genannten Verbraucher einmal gemeinsam liefen; der Merker wird beim Levelwechsel **und**
beim Zurücksetzen gelöscht. `toggle` gibt es, weil eine
Wechselschaltung je nach Verdrahtung XOR _oder_ XNOR ergibt — beides ist richtig, das
gemeinsame Merkmal ist das Umschalten.

Messgeräte-Level brauchen keine Sonderregel: wer ein Amperemeter parallel schaltet, macht
den Verbraucher dunkel; wer ein Voltmeter in Reihe schaltet, sperrt den Stromkreis. Die Physik
erzwingt die richtige Einbauart selbst.

**Messen ist eine Aufgabe, kein Zustand** (entschieden 2026-10-26). „Das Amperemeter zeigt
etwa 100 mA“ ließ sich erfüllen, ohne je etwas zu messen. Ein `measure`-Ziel
(`{ id, quantity: "current" | "voltage", of, unit, label }`) verlangt dagegen zweierlei: ein
Messgerät sitzt so, dass es die Größe an `of` misst, **und** die Lernenden tragen den
abgelesenen Wert ins Feld der Ziel-Liste ein (`Readings`, Text wie getippt). Das Feld
nimmt **nur die Zahl** in der Einheit, die daneben steht (`unit`: A oder mA, V oder mV, vom
Aufgabenautor gewählt). Gerechnet wird nicht um und kein Vorsatz gedeutet: „99 m“ ist
keine gültige Eingabe, bei einer Aufgabe in A gilt 0,099, nicht 99. Es gibt **keine
Toleranz**: verlangt ist genau die Anzeige des Messgeräts (`shownA`/`shownV`, auf die
angezeigten Stellen gerundet) – 98 mA sind nicht 99 mA. Der Sollwert ist das, was das
Messgerät in der Simulation zeigt, keine zweite Zahl in den Leveldaten. `of` ist beim Strom
das Bauteil, durch das er fließt (bei der Quelle: der Gesamtstrom), bei der Spannung das
Bauteil, an dem sie liegt.
`label` ist die Aufgabe („Miss die Spannung an der Lampe“), sie verrät nicht, wie.
`read` bleibt für Ziele, bei denen der **Aufbau** den Wert bestimmen soll (Widerstand
wählen, LED-Strom einstellen).

Kurzschluss und Überlastung lassen ein Level immer scheitern.

## 9. Bewusste Grenzen

- **Lampenwiderstand ist konstant.** Real steigt er mit der Temperatur. Auf einer echten
  Lampe steht deshalb auch kein Widerstandswert, nur Nennspannung und Nennstrom bzw.
  -leistung; „90 Ω“ (`ratings: "resistance"`) ist eine Aufgabenkonvention für Rechenlevel.
  Motor und Summer haben im Modell keine Nennwerte und tragen nur dort ihren Widerstand.
- **Kurzschluss ist eine Stromschwelle je Quelle.** Im freien Baumodus können sehr viele
  parallele Lampen fälschlich als Kurzschluss gelten.
- **Keine Kreuzschaltung.** Ein Kreuzschalter braucht vier Anschlüsse mit zwei
  Anschlusspaaren — auf einem Raster mit vier Zellseiten wird das Symbol unleserlich.
  Der Ausweg wäre, ihn aus **zwei gekoppelten Wechselschaltern** zu bauen (dafür gibt
  es `link`); daran scheitert es auch nicht. Es scheitert am Platz: der Kreuzschalter
  allein braucht einen Block von rund 5 × 5 Zellen samt einer `cross`-Zelle, dazu
  kommen die zwei korrespondierenden Leitungen auf jeder Seite und die beiden
  Wechselschalter. Das ergibt etwa 10 × 6 Zellen. Seit dem Desktop-Layout (Oktober 2026)
  füllt das Brett die Mitte und lässt sich zoomen, der Platz ist also kein Hindernis
  mehr. Machbar, aber ein eigener Schritt, kein Beiwerk.
- **Genau ablesen, nicht genau messen** (entschieden 2026-10-26). Die Anwendung übt das
  exakte Ablesen und Umrechnen einer eindeutigen Anzeige. Messabweichung, Genauigkeitsklassen
  und springende letzte Stellen echter Messgeräte gehören in die Praxis; ob es später Level
  dazu gibt, ist mit den Ausbildern zu klären (siehe Offene Punkte).
- **Messaufgaben erkennen das Messgerät am Wert.** Ein Amperemeter „misst“ `of`, wenn es
  denselben Strom führt, ein Voltmeter, wenn es an derselben Spannung liegt (`measuredValue`).
  Zeigt ein anderer Zweig zufällig denselben Wert (zwei gleiche Lampen parallel), gilt das
  auch – physikalisch käme dasselbe heraus. Das Eintragen eines Messwerts wird noch nicht als
  `LearningEvent` gemeldet.
- **Frei eingetragene Werte lassen sich ertasten.** Beim Vorwiderstand in „Ohmsches Gesetz“
  kann man sich ohne Rechnen an den Wert herantasten. Der Bauschritt prüft auch nur die
  Anzeige „25 mA“, die etwa 263–277 Ω ergeben; die Genauigkeit prüft der Rechenschritt.
  Das Eintragen wird noch nicht als `LearningEvent` gemeldet.
- **Kein gespeicherter Fortschritt.** Gespeichert werden bisher nur die Einstellungen. Der Zähler „x/24 gelöst" gilt nur für die laufende
  Sitzung und wird bei jedem Neuladen zurückgesetzt. Das bleibt erstmal so festgeschrieben.
- **Wenige automatisierte Tests.** `npm test` (vitest) prüft Grundfälle der Simulation und
  des Editierens, die Inhalts-Integrität und die API. Dass jedes Level lösbar ist, prüft noch
  nichts — dafür fehlen Musterlösungen (`solution` am Level). Mit ihnen ließe sich pro Level
  `checkLevel(level, solution, simulate(solution)).won` testen.

## 10. Behobene Fehler (und was daraus folgt)

Diese vier Fehler erklären, warum der Code an manchen Stellen so aussieht, wie er aussieht:

1. **Level 12 war unlösbar** — Geometriefehler, siehe „Die Falle" oben.
2. **Absturz auf Level 13** — die `toggle`-Prüfung war nicht in der Liste der Ziele, für die
   die Schalterkombinationen berechnet werden. Bei neuen Zielarten daran denken.
3. **Löser rechnete nur einen Teil der Schaltung** — er ging von einer gemeinsamen Masse aus.
   Getrennte Kreise und Bauteile ohne geschlossenen Weg lasen sich als kurzgeschlossen.
   Daher heute die Lösung je Zusammenhangskomponente.
4. **Flussanimation lief nicht in Stromrichtung** — sie hing an der Zeichenreihenfolge der
   SVG-Linie, nicht am tatsächlichen Stromweg.

5. **Ein Werkzeug ohne Schaltzeichen blieb leer.** Die Bauteil-Karten zeichnen nicht
   das lucide-Icon aus `TOOLS`, sondern `partGlyph` mit einem Vorschauteil aus `newPart`.
   „opener“ ist aber kein Bauteiltyp, sondern ein `switch` mit `nc` — `newPart` kennt das.
   Bei jedem weiteren Pseudo-Werkzeug daran denken.
6. **Die Beschriftung lag auf dem Türblatt.** `label()` nimmt jetzt einen Abstand als
   dritten Parameter; die Tür setzt ihn auf 31, weil ihr Blatt in geschlossener Stellung
   genau dort liegt, wo Messwerte sonst stehen.

Muster: die Simulation selbst war robust, die Fehler saßen in **Level-Geometrie**,
**Sonderfällen der Netzwerktopologie** und **Darstellung**. Dort lohnt das Prüfen am meisten.

## 11. Arbeitsweise

- **Nicht zum Remote pushen.** Christian übernimmt das selbst; eine Freigabe gilt jeweils
  nur für einen Push.
- **Vor Tests und Screenshots fragen.** Steht so in seinen globalen Vorgaben.
- **Konzeptnamen gehören in den Leveltitel**, nicht in den Merksatz — der Titel wird schon
  beim Bauen gelesen und lenkt das Erkennen. Merksätze bleiben ein bis zwei Sätze.
- **Aufgabe und Ziele sprechen mit Operatoren** (entschieden 2026-10-26), wie in Ausbildung
  und Prüfung: verdrahten, schalten, schließen an, messen, ablesen, prüfen, untersuchen,
  einstellen, berechnen, Fehler finden und beheben. Die **Aufgabe** stellt die Frage oder
  die Lage („Wie groß ist die Stromstärke durch die Lampe?“), das **Ziel** benennt die
  Handlung („Miss die Stromstärke durch die Lampe“) oder einen prüfbaren Zustand („Die
  Lampe leuchtet nur, wenn beide Schalter geschlossen sind“). Ziele als ganze Sätze mit
  Artikel, ohne Großbuchstaben zur Betonung. Kein Sollwert, der das Ergebnis vorwegnimmt,
  keine Lösung in der Aufgabe („lösche die Leitung bei …“), keine Bedienungsanleitung
  („tippe an“, „trage ein“) – Bedienung erklärt sich am Brett. Fachbegriffe statt
  Alltagswörtern: Spannungsquelle statt Batterie, betätigen statt drücken.
- Repository: `https://github.com/NewWorkDesignLab/LMKI-stromkreis-prototyp`

## 12. Offene Punkte

- Kapitel 6 einsortieren: für die neuen Level Plätze in den bestehenden 24 wählen.
- Normgerechte Kreuzungen (später entscheiden): Zieht man eine Leitung gerade durch eine
  bestehende, entsteht heute ein Knotenpunkt. Nach DIN EN 60617 verbindet eine Kreuzung
  ohne Punkt aber nicht. Ob der Editor das automatisch als `cross` setzt, hängt davon ab,
  wie normgerecht die Anwendung sein soll – Level 21 übt genau diesen Unterschied.
- Formatierung: Prettier mit `.prettierrc.json` (Zeilenbreite 100) ist festgelegt.
- Mögliche nächste Konzepte: Kreuzschaltung (siehe Grenzen oben), Quellen parallel,
  Spannungsteiler, Relais, Verbraucher mit unterschiedlichen Widerständen an einer Quelle.
- Zweihandschaltung (zwei Taster gleichzeitig) — geht erst mit Touch, mit der Maus
  lässt sich nur ein Taster halten.
- **Mit den Ausbildern klären (Messaufgaben):** Level zu Messabweichung und
  Genauigkeitsklassen? Signifikante Stellen verlangen („9,00 V“ statt „9“)? Soll die
  Einheit in schwierigeren Aufgaben selbst angegeben werden statt fest am Feld zu stehen?
  Quizfragen nehmen Zahlen heute noch mit Vorsatz an („0,27 kΩ“) – angleichen an das
  Messfeld (nur die Zahl in der vorgegebenen Einheit)? Vorerst bleibt es so (2026-10-28).
- Runden auf Normwerte (E-Reihe) als eigener späterer Schritt: „Wähle den passenden
  Widerstand aus der Normreihe“ – mit den Ausbildern klären.
- Leistung (P = U · I) wird intern schon gerechnet: die Lampenhelligkeit ist
  `I²·R / (Un·In)`, also das Verhältnis zur Nennleistung. Angezeigt wird sie nirgends.

## Testdurchlauf September 2026

Der sichtbare Durchlauf hat 25 Level. `LEVEL_CATALOG` (`content/catalog.ts`) bewahrt die
ursprünglichen Leveldaten; `DEFAULT_CURRICULUM` (`content/curriculum.ts`) stellt daraus den
Testdurchlauf zusammen. Die Nummern unten sind die alten Katalognummern; im Code gelten IDs. Der bisherige
Dimmer (25) ersetzt Level 15. Die bisherigen Level 22–24 sind ausgeblendet.
Die bisherigen Level 26–29 werden als 22–25 angehängt. Das Kühlschrankexperiment
(30) war bereits vor dieser Umstellung nicht mehr im aktuellen Katalog enthalten.
Level 20 bleibt „Ohmsches Gesetz“; es wird zuerst gerechnet (Ghost-Schaltung mit den
gegebenen Größen, Zahleneingabe, URI-Dreieck, Rechenweg am Ghost nach dem ersten Versuch),
dann gebaut: Den berechneten Vorwiderstand (270 Ω) trägt man selbst ein, das Amperemeter
zeigt 25 mA.

Seit Oktober 2026 hängt ein Kapitel „Neu: Level mit Schritten“ an (Level 26 „Die
Lichterkette“) – die Vorlage für Level im neuen Format; sie nutzt jede Schrittart.
