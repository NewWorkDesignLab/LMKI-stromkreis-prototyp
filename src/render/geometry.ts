/* Maße des Spielfelds in SVG-Einheiten. */
export const CELL = 60;
/* Rand um das Spielfeld, der nur die Beschriftungen aufnimmt. Ohne ihn schneidet
   die viewBox einen Messwert unter einem Bauteil am Brettrand ab. Seitlich so
   breit, dass auch der längste Wert danebenpasst, unten nur so viel, dass
   Unterlängen und Konturrand hineinreichen. */
export const PAD_X = 20,
  PAD_B = 6;
export const center = (i: number) => i * CELL + CELL / 2;
