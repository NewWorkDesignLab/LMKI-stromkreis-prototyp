# CLAUDE.md – Arbeitsstandard für dieses Repository

Diese Datei legt fest, **wie** hier gebaut wird. Sie gilt für jede Session. Was das Projekt
fachlich ist und warum es so aussieht, steht in `PROJEKT.md` – vor größeren Änderungen lesen.

Ziel des Branches `complete-rework`: aus dem Prototyp wird eine eigenständige Lernanwendung,
die den Lernstand von Auszubildenden auswertet. Das verlangt eine Architektur, die neue
Aufgabentypen, Bewertungen und Oberflächen aufnimmt, **ohne** dass bestehender Code verbogen
wird. Eine Lösung, die nur den aktuellen Fall abdeckt, ist hier keine Lösung.

## Grundsätze

1. **Erst das Modell, dann die Oberfläche.** Jede fachliche Regel (was verbindet sich, was
   zählt als gelöst, was ist ein Fehlversuch) lebt als reine Funktion in `engine/` oder
   `services/` und hat Tests. React-Komponenten rufen sie nur auf.
2. **Eine Wahrheit.** Ein Sachverhalt steht an genau einer Stelle. Kein zweites Feld, das
   „meistens“ dasselbe sagt; keine Kopie eines Symbols, einer Regel oder einer Konstante.
   Abgeleitetes wird abgeleitet, nicht gespeichert.
3. **Identität über IDs, nie über Position.** Bauteile heißen `G1`, `E1`, `S2` …, Level
   haben Slugs. Ziele, Widgets, Einführungen, Bewertung und API verweisen auf IDs. Ein
   Rasterpunkt (`"x,y"`) ist ein Ort, keine Kennung.
4. **Inhalte sind Daten.** Level, Schritte, Ziele, Einführungen sind JSON-taugliche Daten
   (sie gehen auch über `window.stromkreis` hinein). Kein Level-Sonderfall im Code: braucht
   ein Widget Bauteile, stehen deren IDs in den Leveldaten, nicht in der Komponente.
5. **Erweiterung über Schnittstellen.** Bewertung (`Assessment`), Levelauswahl
   (`LevelSequencer`), Versuche (`AttemptPolicy`), Speicher (`ProgressStore`) sind
   austauschbar. Neues Verhalten = neue Implementierung, nicht `if` in der alten.
6. **Ehrliche Grenzen.** Was bewusst vereinfacht ist, steht als Kommentar am Code und in
   `PROJEKT.md` („Bewusste Grenzen“). Stillschweigende Fallbacks, die Fehler verschlucken,
   sind verboten – Inhaltsfehler werfen beim Laden und fallen im Test auf.

## Schichten

```
domain ← engine ← content / services ← app / api ← features / ui / render
```

| Schicht                       | Inhalt                                                            | darf nicht                          |
| ----------------------------- | ----------------------------------------------------------------- | ----------------------------------- |
| `domain/`                     | reine Typen                                                       | Laufzeitcode enthalten              |
| `engine/`                     | Schaltungsmodell, Simulation, Ziele, Bearbeitungsbefehle, Verlauf | React, Inhalte, Browser-APIs kennen |
| `content/`                    | Level, Konzepte, Lehrplan, Einführungen als Daten                 | Oberfläche importieren              |
| `services/`                   | Fortschritt, Bewertung, Sequenzierung, Prüfung von Fremddaten     | React kennen                        |
| `app/`, `api/`                | Laufzeitwurzel, React-Anbindung, Fremdsteuerung                   | Fachregeln neu erfinden             |
| `features/`, `ui/`, `render/` | Darstellung, Gesten, Panels                                       | Fachregeln enthalten                |

Die Oberfläche greift über `Runtime` auf Inhalt und Fortschritt zu, nicht direkt auf `content/`
(Ausnahmen stehen in `PROJEKT.md`).

## Das Schaltungsmodell (verbindlich)

- `Circuit = { parts: Record<PartId, Part>, wires: Record<WireKey, Wire> }`.
- Ein **Bauteil** sitzt auf einem Rasterpunkt, höchstens eines je Punkt.
- Eine **Leitung** ist eine Kante zwischen zwei _benachbarten_ Punkten, Schlüssel
  `"x,y|x,y"` in kanonischer Reihenfolge (`wireKey`). Lange Leitungen bestehen aus
  mehreren Kanten.
- **Verbunden ist nur, was als Kante existiert.** Nebeneinanderliegen verbindet nichts.
  Eine Kante zählt elektrisch nur, wenn beide Enden dort einen Anschluss haben.
- Ein Punkt ohne Bauteil, an dem Kanten enden, ist ein Leitungsknoten (≥ 3 Kanten =
  Knotenpunkt). Eine `cross` hält waagerecht und senkrecht getrennt.
- Wände gehören zum Brett (`LevelDef.walls`), nicht zur Schaltung.
- Änderungen gehen **nur** über die Befehle in `engine/editing.ts`. Sie prüfen Regeln
  (Brettgrenzen, Wände, Anschlüsse, Schutz vorgegebener Teile) und geben bei Ablehnung das
  unveränderte Objekt zurück (Referenzgleichheit = „nichts passiert“).
- **Verlauf (Strg+Z):** strukturelle Änderungen (setzen, löschen, verbinden, drehen, Wert
  ändern, zurücksetzen) kommen in den Verlauf, eine Geste = ein Eintrag. Bedienung
  (Schalter, Taster, Sicherung) nicht; sie bleibt beim Rückgängigmachen erhalten.
- Das alte Zellformat (`content/legacy.ts`) ist ein **Übergangsformat** für die Prototyp-Level
  und wird beim Laden übersetzt. Neue Level und neue Funktionen nie darin schreiben.

## Code-Qualität

- **TypeScript:** neuer und angefasster Code ist vollständig typisiert, kein `any`, keine
  `as`-Umgehungen ohne Kommentar. `strict` ist projektweit noch aus (Altlast der Engine);
  das ist kein Freibrief für neuen Code.
- **Reine Funktionen** für alles Fachliche: Eingabe rein, neues Objekt raus, keine Mutation
  von Argumenten.
- **Benennung und Kommentare auf Deutsch**, wie im bestehenden Code. Kommentare erklären das
  _Warum_ (Entscheidung, Falle, Physik), nicht das Offensichtliche.
- **Formatierung:** Prettier (`.prettierrc.json`, Breite 100).
- **Keine magischen Zahlen** ohne Einheit und Begründung (siehe `DEF` in `engine/parts.ts`).
- **Barrierefreiheit:** Bedienelemente mit `aria-label`/`aria-pressed`, Tastaturbedienung
  mitdenken, Tastflächen ≥ 44 px.

## Tests

- Jede neue Regel in `engine/` oder `services/` bekommt einen vitest-Test, der das
  _Verhalten_ beschreibt (Testnamen als deutscher Satz).
- `content/content.test.ts` muss jedes Level laden, prüfen und auf existierende IDs
  verweisen lassen. Neue Inhaltsfelder mit Verweisen → dort mitprüfen.
- Ein Fehler, der behoben wird, bekommt einen Test, der ihn wieder findet.

## Definition of Done

1. `npm run typecheck` und `npm test` sind grün.
2. Sichtbare Änderungen wurden im Browser (`.claude/launch.json`, Port 5180) geprüft.
3. `PROJEKT.md` ist aktuell, wenn sich Modell, Formate, Grenzen oder Arbeitsweise ändern.
4. Kein toter Code, keine auskommentierten Reste, keine ungenutzten Exporte.

## Arbeitsweise

- **Nicht zum Remote pushen.** Christian pusht selbst; eine Freigabe gilt für einen Push.
- **Vor Tests und Screenshots fragen**, sofern in der Session nichts anderes vereinbart ist.
- Commit-Nachrichten auf Deutsch, im Stil der bestehenden Historie.
- Große Umbauten in Schritten: zuerst Modell und Tests, dann Oberfläche. Bei echten
  Weichenstellungen (Datenformat, Bedienkonzept) vorher fragen statt raten.
