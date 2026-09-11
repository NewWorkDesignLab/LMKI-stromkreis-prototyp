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
- **Umfang:** 24 Level in 5 Kapiteln, dazu ein Testkapitel mit 6 noch nicht
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
Flussanimation), darunter liegt zusätzlich ein echter Gleichstrom-Löser. Bewusst *kein*
SPICE-Nachbau — nur so viel Physik, wie die Lernziele brauchen.

## 3. Projektaufbau

```
stromkreis-game.tsx   das gesamte Spiel: Simulation, Symbole, Level, UI (~1900 Zeilen)
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
- `values` — Werteliste; Antippen schaltet `r` durch die Liste. Eine Liste mit nur
  einem Wert friert das Bauteil ein (und blendet das ⟳ aus).
- `nc` — macht aus einem `switch` oder `button` einen **Öffner**. Achtung: `closed` heißt auch dort
  „leitet“, nicht „betätigt“ — ein Öffner startet deshalb mit `closed: true`. Dadurch
  bleiben Löser, Zielprüfung und Schalterkombinationen unverändert; `nc` ändert nur
  das Symbol (Querstrich am festen Kontakt) und die Beschriftung.
- `name` — überschreibt die Beschriftung unter der Zelle (z. B. „Not-Aus“, „Schließer“).
- `danger` — zeichnet Umriss und Ruhekontakt rot (Not-Aus).

Eine Zelle vom Typ **`door`** ist kein Bauteil, sondern ein Betätiger: sie hat keine
Anschlüsse, taucht in der Simulation nicht auf, und ein Antippen schaltet den Kontakt,
auf den ihr `at` zeigt. Sie löst das eigentliche Verständnisproblem am Öffner — dass
nämlich die *Tür* drückt, und zwar wenn sie **zu** ist. Gezeichnet wird sie im Grundriss
(Angelpunkt, Türblatt, gestrichelter Schwenkbogen, Anschlag) und dreht sich zur
Kontaktzelle hin; liegt sie an, wird der Anschlag mitmarkiert. Der Platz für den Kontakt
ist in Level 30 mit einer gewöhnlichen, ersetzbaren Leitung markiert — so ist sichtbar,
wohin er gehört, und die Orientierungsprüfung in `canPlace` greift.
- `link` — koppelt mehrere Wechselschalter: sie springen gemeinsam um. Gedacht für
  einen Kreuzschalter aus zwei Umschaltern; bisher von keinem Level benutzt.
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

Ein `switch` oder `button` mit `nc: true` ist ein **Öffner** (Ruhekontakt): im
Ruhezustand leitet er, betätigt trennt er. Elektrisch bleibt er ein gewöhnlicher idealer
Kontakt — der Unterschied liegt allein im Startzustand und im Symbol. Beim Taster dreht
`nc` zusätzlich Drücken und Loslassen um.

Ein einzelner Öffner ist von einem Schließer kaum zu unterscheiden — Level 28 stellt sie
deshalb nebeneinander an dieselbe Quelle, statt den Öffner allein zu zeigen.

„sperrt“ steht nur an einer wirklich **verpolten** LED — also wenn eine deutliche
Gegenspannung an ihr liegt. Eine LED, die bloß überbrückt oder stromlos ist, zeigt 0 mA;
sonst stünde in Level 27 „sperrt“ an einer richtig gepolten LED.

Ein Voltmeter gilt in der topologischen Sicht bewusst als **nicht leitend** — es schließt
keinen Stromkreis. In Reihe geschaltet sperrt es den Stromkreis praktisch, genau wie in echt.

## 7. Level

| # | Kapitel / Level | Konzept |
|---|---|---|
| | **Der Stromkreis** | |
| 1 | Schließe den Stromkreis | geschlossener Stromkreis |
| 2 | Der Schalter | gewollte Unterbrechung |
| 3 | Reihenschaltung = UND | Reihe, UND-Logik |
| 4 | Parallelschaltung – beide Lampen | Parallelzweige |
| 5 | Wähle den Stromweg | eine Lampe muss aus bleiben |
| | **Kurzschluss & Schutz** | |
| 6 | Der Kurzschluss | überbrückte Lampe finden und löschen |
| 7 | Die Sicherung | Überstromschutz |
| 8 | Durchlass- und Sperrrichtung der LED | Durchlass- und Sperrrichtung |
| 9 | Der Vorwiderstand | R = (Uq − UF) / I |
| | **Schalter & Logik** | |
| 10 | Der Taster | Schließer |
| 11 | Parallelschaltung = ODER | ODER-Logik |
| 12 | Der Wechselschalter | Umschalten statt Ein/Aus |
| 13 | Die Wechselschaltung | Flurlicht, zwei korrespondierende Leitungen |
| 14 | Motor und Summer | eigener Schalter je Zweig |
| | **Größen & Messen** | |
| 15 | Der Widerstand | Strombegrenzung |
| 16 | Amperemeter in Reihe | richtige Einbauart |
| 17 | Voltmeter parallel | richtige Einbauart |
| 18 | Reihenschaltung teilt die Spannung | Spannungsteilung |
| 19 | Parallelschaltung teilt den Strom | Stromteilung |
| 20 | Ohmsches Gesetz | R = U / I rechnen |
| | **Schaltplan lesen** | |
| 21 | Knotenpunkt oder Kreuzung? | Knotenpunkt verbindet, Kreuzung nicht |
| 22 | Am Knotenpunkt teilt sich der Strom | Knotenregel, Zweig- und Gesamtstrom |
| 23 | Anders gezeichnet – UND | Topologie statt Geometrie |
| 24 | Zwei Spannungsquellen in Reihe | Spannungen addieren sich bei richtiger Polung |
| | **Neue Level (Test)** | *noch nicht einsortiert* |
| 25 | Der Dimmer | Widerstand in Reihe regelt die Helligkeit |
| 26 | Fehlersuche: Die Wechselschaltung | korrespondierende Leitungen gebrückt |
| 27 | Das Licht im Schalter | LED parallel zum Schalter |
| 28 | Schließer und Öffner | beide Kontaktarten im direkten Vergleich |
| 29 | Der Not-Aus | Öffner in der Hauptleitung, Reihenfolge erzwungen |
| 30 | Der Kühlschrank | die Tür betätigt den Kontakt; Kontaktart wählen |

Kapitel 6 ist eine **Ablage**: die Level liegen hinter den 24 bestehenden, damit sie
sich durchspielen lassen, ohne die vorhandene Reihenfolge zu verschieben. Welches
davon welchen Platz bekommt — und welches bestehende dafür weicht — ist offen.

Level bestehen nur aus Daten (`CHAPTERS`): Name, Feldgröße, Startzellen, Werkzeugpalette,
Hinweis, Merksatz und optionale Ziele. `showValues: true` blendet Spannungen und Ströme ein. `labelSwitches: true` schreibt
unter jeden Kontakt „Schließer“ bzw. „Öffner“ — gedacht für Level, in denen der Spieler
die Kontaktart selbst wählt. `latch` siehe Zielsystem. `frames` zeichnet gestrichelte
**Gerätegrenzen** (Rechtecke in Feldkoordinaten) — die Konvention „das ist ein Bauteil“
aus dem Installationsplan, reines Dekor ohne Wirkung auf die Simulation. Level 27 fasst
damit Schalter und Orientierungslicht zu einem Gerät zusammen.

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
| `state` | die genannten Kontakte sind **jetzt** betätigt bzw. nicht betätigt |
| `seen` | die in `latch` genannten Verbraucher liefen im Verlauf schon einmal gemeinsam |
| `fuse` | die Sicherung hält |

`logic` und `toggle` **simulieren alle Schalterkombinationen durch**, nicht nur den aktuellen
Zustand. Dadurch wird wirklich die Verdrahtung geprüft.

Ihre Eingänge bedeuten dabei **„betätigt“, nicht „leitet“** — beim Öffner ist das
gegenläufig. Ein vorangestelltes `!` dreht einen Eingang um: `inputs: ["!1,0", "3,1"]`
heißt „Not-Aus nicht gedrückt UND Schalter zu“. Bei gewöhnlichen Kontakten fallen beide
Lesarten zusammen, dort ändert das nichts.

`state` und `seen` gibt es, weil manche Aufgaben eine **Reihenfolge** verlangen. Level 29
ließe sich sonst lösen, indem man erst den Not-Aus drückt und dann die Schalter umlegt —
die Anlage hätte nie gelaufen. `latch: { lit: [...] }` am Level merkt sich, dass die
genannten Verbraucher einmal gemeinsam liefen; der Merker wird beim Levelwechsel **und**
beim Zurücksetzen gelöscht. `toggle` gibt es, weil eine
Wechselschaltung je nach Verdrahtung XOR *oder* XNOR ergibt — beides ist richtig, das
gemeinsame Merkmal ist das Umschalten.

Messgeräte-Level brauchen keine Sonderregel: wer ein Amperemeter parallel schaltet, macht
den Verbraucher dunkel; wer ein Voltmeter in Reihe schaltet, sperrt den Stromkreis. Die Physik
erzwingt die richtige Einbauart selbst.

Kurzschluss und Überlastung lassen ein Level immer scheitern.

## 9. Bewusste Grenzen

- **Lampenwiderstand ist konstant.** Real steigt er mit der Temperatur.
- **Kurzschluss ist eine Stromschwelle je Quelle.** Im freien Baumodus können sehr viele
  parallele Lampen fälschlich als Kurzschluss gelten.
- **Keine Kreuzschaltung.** Ein Kreuzschalter braucht vier Anschlüsse mit zwei
  Anschlusspaaren — auf einem Raster mit vier Zellseiten wird das Symbol unleserlich.
  Der Ausweg wäre, ihn aus **zwei gekoppelten Wechselschaltern** zu bauen (dafür gibt
  es `link`); daran scheitert es auch nicht. Es scheitert am Platz: der Kreuzschalter
  allein braucht einen Block von rund 5 × 5 Zellen samt einer `cross`-Zelle, dazu
  kommen die zwei korrespondierenden Leitungen auf jeder Seite und die beiden
  Wechselschalter. Das ergibt etwa 10 × 6 Zellen — das Brett wird bei 560 px
  gedeckelt, die Symbole würden also spürbar schrumpfen. Machbar, aber ein eigener
  Schritt, kein Beiwerk.
- **Kein gespeicherter Fortschritt.** Der Zähler „x/24 gelöst" gilt nur für die laufende
  Sitzung und wird bei jedem Neuladen zurückgesetzt. Das bleibt erstmal so festgeschrieben.
- **Keine automatisierten Tests.** Geprüft wurde durch Durchspielen. Für einen
  Prüflauf lassen sich die reinen Blöcke (`constants`…`Symbole`, `Level`…`Tutorial`,
  `Ziele`…`Werkzeuge`) aber ohne Änderung in ein `.mjs` kopieren und mit Node gegen
  `simulate`/`checkLevel` fahren — so wurden die Level aus Kapitel 6 verifiziert.

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

5. **Ein Werkzeug ohne Schaltzeichen blieb leer.** Die Bauteil-Kacheln zeichnen nicht
   das lucide-Icon aus `TOOLS`, sondern `cellGlyph` mit einer Vorschauzelle. „opener“ ist
   aber kein Zelltyp, sondern ein `switch` mit `nc` — die Kachel war deshalb leer. Dafür
   gibt es jetzt `previewCell(t, orient)`, das beide Palettenstellen benutzen. Bei jedem
   weiteren Pseudo-Werkzeug daran denken.
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
- Repository: `https://github.com/NewWorkDesignLab/LMKI-stromkreis-prototyp`

## 12. Offene Punkte

- Kapitel 6 einsortieren: für die neuen Level Plätze in den bestehenden 24 wählen.
- Formatierung: die Datei wurde am 11.09.2026 von einem Editor-Formatter (Prettier-Stil)
  umbrochen und ist dadurch von ~1900 auf ~3600 Zeilen gewachsen. Inhaltlich identisch.
  Wenn der dichte Handsatz zurück soll, bräuchte es eine `.prettierrc` oder ein
  `.editorconfig` — sonst bricht der nächste Speichervorgang sie wieder um.
- Mögliche nächste Konzepte: Kreuzschaltung (siehe Grenzen oben), Quellen parallel,
  Spannungsteiler, Relais, Verbraucher mit unterschiedlichen Widerständen an einer Quelle.
- Zweihandschaltung (zwei Taster gleichzeitig) — geht erst mit Touch, mit der Maus
  lässt sich nur ein Taster halten.
- Leistung (P = U · I) wird intern schon gerechnet: die Lampenhelligkeit ist
  `I²·R / (Un·In)`, also das Verhältnis zur Nennleistung. Angezeigt wird sie nirgends.
- Echter Tailwind-Build statt CDN, falls das Spiel ausgeliefert wird.
