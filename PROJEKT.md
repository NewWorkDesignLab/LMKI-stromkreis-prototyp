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
- **Umfang:** 24 Level in 5 Kapiteln, dazu ein freier Baumodus.

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
Flussanimation), darunter liegt zusätzlich ein echter Gleichstrom-Löser. Bewusst *kein*
SPICE-Nachbau — nur so viel Physik, wie die Lernziele brauchen.

## 3. Projektaufbau

```
stromkreis-game.tsx   das gesamte Spiel: Simulation, Symbole, Level, UI (~1300 Zeilen)
main.jsx              React-Einstiegspunkt
index.html            lädt Tailwind über das Play-CDN
vite.config.js        Dev-Server auf Port 5180
.claude/launch.json   Startkonfiguration
```

```bash
npm install && npm run dev
```

Tailwind läuft **über CDN**, nicht über einen Build. Für ein Durchspiel-Setup reicht das;
für eine echte Auslieferung wäre ein richtiger Tailwind-Build der nächste Schritt.

Die Spieldatei ist bewusst eine Datei geblieben, weil sie aus einem Artefakt stammt und so
weiterhin als Artefakt lauffähig ist. Sobald sie automatisiert getestet werden soll, müsste
die Engine (`simulate`, `checkLevel`, Level-Daten) in ein eigenes Modul ohne JSX wandern.

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
   benachbarte Zellen, geschlossene Schalter und Taster, der aktive Zweig eines
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

Das Spielfeld ist ein Objekt `{"x,y": zelle}`. Fehlt ein Schlüssel, ist die Zelle leer.

```js
{ type: "lamp", orient: "v", goal: "off", lock: true, user: true, r: 360 }
```

- `orient` — `"h"` (Anschlüsse West/Ost) oder `"v"` (Nord/Süd). Zweipole nur.
- `dir` / `pos` — nur Wechselschalter: `dir` ist die Seite des Wurzelanschlusses, die beiden
  Ausgänge liegen senkrecht dazu. `pos` (0/1) wählt den aktiven Ausgang.
- `rev` — dreht die Polung um (LED, Quelle).
- `flip` — erlaubt dem Spieler, `rev` per Antippen zu ändern.
- `values` — Werteliste; Antippen schaltet `r` durch die Liste.
- `lock` — vorverlegte Leitung, die nicht gelöscht werden darf.
- `user` — vom Spieler platziert, darf auch im Level-Modus gelöscht werden.
- `goal: "off"` — dieser Verbraucher muss aus bleiben (wird rot gestrichelt gezeichnet).

**Knotennamen** entstehen aus Zelle und Seite. Eine Leitungszelle fasst alle vier Seiten zu
einem Knoten zusammen (`w:x,y`), eine **Kreuzung** hält waagerecht und senkrecht getrennt
(`ch:x,y` / `cv:x,y`) — daher „Kreuzung ohne Verbindung".

## 6. Bauteile

| Typ | Symbol | Kennwerte |
|---|---|---|
| `wire` | Linie, Punkt nur bei ≥ 3 Verbindungen (Knotenpunkt) | ideal |
| `cross` | waagerechte Leitung springt über die senkrechte | zwei getrennte Knoten |
| `battery` | Kästchen mit + / − | 9 V, ri 0,5 Ω, imax 1 A |
| `lamp` | Glühlampe, Helligkeit nach Leistung | 90 Ω, 9 V / 100 mA |
| `led` | Dreieck mit Balken | UF 2 V, rs 25 Ω, imax 30 mA |
| `resistor` | Rechteck | 220 Ω (oder `values`) |
| `switch` | Schalter mit Kontakten | ideal |
| `button` | Taster (Schließer), leitet nur beim Drücken | ideal |
| `spdt` | Wechselschalter, ein Anschluss auf zwei Ausgänge | ideal |
| `motor` | Kreis mit M | 60 Ω, läuft ab 40 mA |
| `buzzer` | Halbkreis | 120 Ω, summt ab 30 mA |
| `fuse` | Rechteck mit Strich | löst über 500 mA aus |
| `ammeter` | Kreis mit A | 5 mΩ, **in Reihe** |
| `voltmeter` | Kreis mit V | 1 MΩ, **parallel** |
| `wall` | gesperrte Zelle | — |

Ein Voltmeter gilt in der topologischen Sicht bewusst als **nicht leitend** — es schließt
keinen Stromkreis. In Reihe geschaltet sperrt es den Kreis praktisch, genau wie in echt.

## 7. Level

| # | Kapitel / Level | Konzept |
|---|---|---|
| | **Der Stromkreis** | |
| 1 | Schließe den Kreis | geschlossener Kreis |
| 2 | Der Schalter | gewollte Unterbrechung |
| 3 | Reihenschaltung = UND | Reihe, UND-Logik |
| 4 | Parallel – beide Lampen | Parallelzweige |
| 5 | Wähle den Pfad | eine Lampe muss aus bleiben |
| | **Kurzschluss & Schutz** | |
| 6 | Der Kurzschluss | überbrückte Lampe finden und löschen |
| 7 | Die Sicherung | Überstromschutz |
| 8 | Die LED hat eine Polung | Durchlass- und Sperrrichtung |
| 9 | Der Vorwiderstand | R = (Uq − UF) / I |
| | **Schalter & Logik** | |
| 10 | Der Taster | Schließer |
| 11 | Parallel = ODER | ODER-Logik |
| 12 | Der Wechselschalter | Umschalten statt Ein/Aus |
| 13 | Die Wechselschaltung | Flurlicht, zwei korrespondierende Leitungen |
| 14 | Motor und Summer | eigener Schalter je Zweig |
| | **Größen & Messen** | |
| 15 | Der Widerstand | Strombegrenzung |
| 16 | Amperemeter in Reihe | richtige Einbauart |
| 17 | Voltmeter parallel | richtige Einbauart |
| 18 | Reihe teilt die Spannung | Spannungsteilung |
| 19 | Parallel teilt den Strom | Stromteilung |
| 20 | Ohmsches Gesetz | R = U / I rechnen |
| | **Schaltplan lesen** | |
| 21 | Der Knotenpunkt | drei Leitungen treffen zusammen, Knotenregel |
| 22 | Kreuzung ohne Verbindung | zwei getrennte Kreise, Kreuzungssymbol |
| 23 | Anders gezeichnet – UND | Topologie statt Geometrie |
| 24 | Zwei Quellen in Reihe | Spannungen addieren sich bei richtiger Polung |

Level bestehen nur aus Daten (`CHAPTERS`): Name, Feldgröße, Startzellen, Werkzeugpalette,
Hinweis, Merksatz und optionale Ziele. `showValues: true` blendet Spannungen und Ströme ein.

### Level bauen: die Falle

**Zwei benachbarte Zellen mit Anschlüssen sind elektrisch verbunden — immer.** Eine
Rückleitung, die neben einem Abzweig verläuft, schließt ihn kurz. Level 12 war deshalb
anfangs *unlösbar*: jeder mögliche Weg der Rückleitung berührte eine Stichleitung.

Beim Entwerfen also für jede Zelle der geplanten Lösung alle vier Nachbarn prüfen und
Wände (`wall`) gezielt setzen. Faustregel: Abzweige so kurz wie möglich halten — im
korrigierten Level 12 sitzen die Lampen direkt an den Ausgängen des Wechselschalters,
dadurch gibt es keine Stichleitungen, die einen Korridor blockieren.

## 8. Zielsystem

Ziele stehen pro Level in `goals`; für Verbraucher ohne eigenes Ziel wird automatisch
„leuchtet" bzw. „bleibt aus" ergänzt (gleichartige werden zu einer Zeile zusammengefasst).

| Art | Bedeutung |
|---|---|
| `on` | Verbraucher an / aus |
| `read` | Messgerät zeigt einen Wert im Bereich `min`–`max` |
| `logic` | Lampe folgt `and` / `or` / `xor` / `id` / `not` über die genannten Schalter |
| `toggle` | jeder einzelne Schalter kehrt den Zustand um (Wechselschaltung) |
| `fuse` | die Sicherung hält |

`logic` und `toggle` **simulieren alle Schalterkombinationen durch**, nicht nur den aktuellen
Zustand. Dadurch wird wirklich die Verdrahtung geprüft. `toggle` gibt es, weil eine
Wechselschaltung je nach Verdrahtung XOR *oder* XNOR ergibt — beides ist richtig, das
gemeinsame Merkmal ist das Umschalten.

Messgeräte-Level brauchen keine Sonderregel: wer ein Amperemeter parallel schaltet, macht
den Verbraucher dunkel; wer ein Voltmeter in Reihe schaltet, sperrt den Kreis. Die Physik
erzwingt die richtige Einbauart selbst.

Kurzschluss und Überlastung lassen ein Level immer scheitern.

## 9. Bewusste Grenzen

- **Lampenwiderstand ist konstant.** Real steigt er mit der Temperatur.
- **Kurzschluss ist eine Stromschwelle je Quelle.** Im freien Baumodus können sehr viele
  parallele Lampen fälschlich als Kurzschluss gelten.
- **Keine Kreuzschaltung.** Ein Kreuzschalter braucht vier Anschlüsse mit zwei
  Anschlusspaaren — auf einem Raster mit vier Zellseiten wird das Symbol unleserlich.
- **Kein gespeicherter Fortschritt.** Der Zähler „x/24 gelöst" gilt nur für die laufende
  Sitzung und wird bei jedem Neuladen zurückgesetzt. Das bleibt erstmal so festgeschrieben.
- **Keine automatisierten Tests.** Geprüft wurde durch Durchspielen.

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

Muster: die Simulation selbst war robust, die Fehler saßen in **Level-Geometrie**,
**Sonderfällen der Netzwerktopologie** und **Darstellung**. Dort lohnt das Prüfen am meisten.

## 11. Arbeitsweise

- **Nicht zum Remote pushen.** Christian übernimmt das selbst; eine Freigabe gilt jeweils
  nur für einen Push.
- **Vor Tests und Screenshots fragen.** Steht so in seinen globalen Vorgaben.
- **Konzeptnamen gehören in den Leveltitel**, nicht in den Merksatz — der Titel wird schon
  beim Bauen gelesen und lenkt das Erkennen. Merksätze bleiben ein bis zwei Sätze.
- Repository: `https://github.com/NewWorkDesignLab/LMKI-stromkreis-prototyp`

## 12. Offene Punkte

- Mögliche nächste Konzepte: Kreuzschaltung (neues Bauteil nötig), Quellen parallel,
  Spannungsteiler, Relais, Verbraucher mit unterschiedlichen Widerständen an einer Quelle.
- Echter Tailwind-Build statt CDN, falls das Spiel ausgeliefert wird.
