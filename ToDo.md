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

Farbe nur in der Palette, Brett bleibt normgerecht schwarz; Brett in Originalgröße, Zoom nur
als Hilfe für große Schaltungen; Ziehhilfe verbindet live (entschieden 2026-10-23).
Aufgabe und Ziele direkt am Brett statt in einer rechten Spalte („Variante B“), übrige
Schritte quer mit Bühne (entschieden 2026-10-23).

- [x] Links Bauteilpalette (farbig nach Gruppe, mit Namen und Kurzinfo), Mitte eine Spalte
      aus Aufgabe + Ziele, Brett, Zustand + Rückgängig/Zurücksetzen (Prüfen kommt mit Phase 4)
- [x] Brettrahmen wächst mit dem Level; Zoom nur, wenn das Brett nicht passt, und im
      freien Bauen
- [x] Alltag, Vermutung, Frage, Merksatz im Querformat: Anschauung bzw. Schaltung links
- [x] Merksatz zeigt die eigene gelöste Schaltung; nach dem Lösen klingt er unter dem Brett an
- [ ] Variante D für Sandkasten und große Level: Brett füllt das Fenster, Aufgabe schwebend,
      Bauteile als Dock
- [x] Moment des Lösens: Rahmen leuchtet auf, Häkchen ploppen, „Geschafft“ gleitet herein
- [x] Aufgabe beim Start kurz hervorheben (abschaltbar)
- [x] Materialvorrat je Werkzeug (`stock`), Anzahl auf der Kachel
- [ ] Kurzer Übergang zwischen den Schritten, damit die Bühne als dieselbe wirkt
- [x] Brett in Originalgröße (100 % = Prototyp), zu große Bretter bis 70 % verkleinert;
      Zoom (Mausrad) und Verschieben (Leertaste/mittlere Maustaste); Frei bauen auf 14 × 9
- [ ] Zusatzbausteine (z. B. Funktionsansicht beim Öffner) ohne Scrollen unterbringen
- [x] Panels als eigenständige Bausteine, damit Mobil später anders anordnen kann
- [x] Kopfleiste: Modus, Levelnavigation, Ton, Schaltzeichen, Einstellungen
- [x] Einstellungen (gespeichert): Ziehhilfe, Flussanimation, Ton + Lautstärke
- [x] Tasten R (drehen), W/Esc (Verdrahten), E (Löschen); Bauteile bewusst ohne Kürzel
- [ ] Bauteile verschieben (Ziehen mit Modifikator oder eigenes Werkzeug)
- [ ] Messwerte als Liste (Spannung/Strom je Bauteil, nicht nur am Brett) – Platz dafür
      finden, ohne wieder eine Seitenspalte aufzumachen
- [ ] Linke Spalte bei Leveln ohne Bauteile sinnvoll nutzen (z. B. Schaltzeichen des Levels)

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

- [x] Stummschalter in der Kopfleiste und Lautstärke in den Einstellungen (ohne Töne)
- [ ] Dezente Effekte per Web Audio (kein Asset nötig), an `settings.sound`/`volume` hängen

## Später / offen

- [ ] Normgerechte Kreuzungen: Leitung gerade durch Leitung → `cross` statt Knotenpunkt?
      (DIN EN 60617; Level 21 übt genau das) – siehe PROJEKT.md „Offene Punkte“
- [ ] Videos als Schrittinhalt mit eigenem Player
- [ ] Mobile Ansicht
- [ ] Ausbilder-Ansicht / Export der Auswertung
