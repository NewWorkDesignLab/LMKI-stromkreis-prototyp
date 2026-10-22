# ToDo – Rework zur Lernanwendung

Stand und Reihenfolge der geplanten Umbauten auf `complete-rework`. Wer eine neue
Session beginnt: zuerst `CLAUDE.md` (Arbeitsstandard) und `PROJEKT.md` (Fachliches)
lesen, dann hier den nächsten offenen Punkt nehmen. Erledigtes abhaken, nicht löschen.

## 1. Schaltungsmodell ✅

- [x] Leitungen als Kanten zwischen Rasterpunkten, Nachbarn verbinden sich nicht von selbst
- [x] Bauteil-IDs (G1, E1, S1 …), Verweise nur noch über IDs
- [x] Rückgängig/Wiederholen (Strg+Z/Strg+Y), Rechtsklick löscht, Vorschau unter dem Zeiger
- [x] Prototyp-Level im Altformat, Übersetzung beim Laden (`content/legacy.ts`)
- [x] `CLAUDE.md` mit Architektur- und Qualitätsstandard

## 2. Level als Abfolge von Schritten ✅

Darstellung: **Schrittleiste** – immer ein Schritt sichtbar, Leiste oben, erledigte
Schritte wieder ansehbar, spätere gesperrt (entschieden 2026-10-22).

- [x] A: Schrittmodell (`context`, `predict`, `build`, `quiz`, `summary`), Ablauf als reine
      Funktionen, Antwortauswertung (Auswahl, Zahl mit Toleranz und Einheit), Prüfung,
      Übersetzer erzeugt `build` + `summary`
- [x] B: Lernereignisse je Schritt (`step_started`, `step_completed`, `answer_submitted`),
      Level gelöst = alle Pflichtschritte erledigt, API-Version 2
- [x] C: `LessonView` mit Schrittleiste und Darstellung je Schrittart
- [x] D: Alltags-„?“ (Lichtschalter, Kühlschrank) als `context`-Schritte, Ohmsches Gesetz als
      „erst rechnen, dann bauen“, Beispiel-Level mit allen Schrittarten
- [x] E: Doku (PROJEKT.md, CLAUDE.md), Browserprüfung

## 3. Desktop-Layout

- [ ] Drei Spalten: links Bauteilpalette (farbig, mit Namen und Kurzinfo beim Überfahren),
      Mitte großes Brett, rechts aktueller Schritt / Aufgabe / Checkliste / Messwerte
- [ ] Obere Leiste: Rückgängig, Wiederholen, Zurücksetzen, Prüfen
- [ ] Brett mit Zoom und Verschieben für große Felder; Deckel von 560 px aufheben
- [ ] Panels als eigenständige Bausteine, damit Mobil später anders anordnen kann
- [ ] Bauteile verschieben (Ziehen mit Modifikator oder eigenes Werkzeug)

## 4. Versuche, Bewertung, Fehlerdiagnose

- [ ] „Prüfen“-Knopf: ein Versuch = eine bewusste Abgabe (Simulation läuft weiter live)
- [ ] `AttemptPolicy` verdrahten: gestaffelte Tipps → Musterlösung mit Erklärung → Level
      „noch nicht sicher“, statt hartem Stopp
- [ ] Sequenzierer schickt über `requires` der Konzepte zu einem Vorstufen-Level und bringt
      später eine Variante zurück
- [ ] Fehlerdiagnose: typische Fehlbauten erkennen und einer Fehlvorstellung zuordnen
      (Amperemeter parallel, Voltmeter in Reihe, Schalter nur in einem Zweig, Lampe
      überbrückt, LED verpolt …) und gezielt erklären
- [ ] Sicherheitsabfrage („Wie sicher bist du?“) vor dem Prüfen
- [ ] Undo-Verlauf als Lernspur auswerten (planvoll vs. ausprobieren)
- [ ] Persistenter Fortschritt (mind. localStorage), später Server; Datenschutz (DSGVO) früh klären
- [ ] Auswertung am Ende: verständliche Rückmeldung je Konzept

## 5. Inhalte

- [ ] Neue, schwerere Level ohne vorgegebene Boxen/Wände, mehrere Lösungen zulässig
- [ ] Widerstandswerte frei eintragen (E-Reihen, Belastbarkeit P = U·I, Durchbrennen)
- [ ] Fehlersuche-Level mit Messgerät
- [ ] Messspitzen: zwei Punkte anklicken und Spannung ablesen
- [ ] Einschränkungen als Schwierigkeit (max. Bauteile, nur bestimmte Werte)
- [ ] Betriebsmittelkennzeichnung (-S1, -P1) anzeigen
- [ ] Sandbox größer und variabler, Schaltungen speichern/teilen (JSON/Link)
- [ ] Prototyp-Level ins neue Format überführen oder ersetzen, dann `content/legacy.ts` entfernen

## 6. Sounds

- [ ] Dezente Effekte per Web Audio (kein Asset nötig), gut sichtbarer Stummschalter

## Später / offen

- [ ] Normgerechte Kreuzungen: Leitung gerade durch Leitung → `cross` statt Knotenpunkt?
      (DIN EN 60617; Level 21 übt genau das) – siehe PROJEKT.md „Offene Punkte“
- [ ] Videos als Schrittinhalt mit eigenem Player
- [ ] Mobile Ansicht
- [ ] Ausbilder-Ansicht / Export der Auswertung
