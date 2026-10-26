/* Maße des Spielfelds in SVG-Einheiten. */
export const CELL = 60;
/* Rand um das Spielfeld, der nur die Beschriftungen aufnimmt. Ohne ihn schneidet
   die viewBox einen Messwert unter einem Bauteil am Brettrand ab. Seitlich so
   breit, dass auch der längste Wert danebenpasst, unten nur so viel, dass
   Unterlängen und Konturrand hineinreichen. */
export const PAD_X = 20,
  PAD_B = 6;
export const center = (i: number) => i * CELL + CELL / 2;

/** Ausdehnung der viewBox eines Bretts mit W × H Punkten (samt Beschriftungsrand). */
export const boardExtent = (W: number, H: number) => ({
  w: W * CELL + PAD_X * 2,
  h: H * CELL + PAD_B,
});

/* Lage des Zeigers in Punktkoordinaten, mit Bruchteil: (0,0) ist der erste Punkt,
   0,5 liegt genau zwischen zwei Punkten. */
export interface Pos {
  fx: number;
  fy: number;
}

/* Die viewBox ist um den Beschriftungsrand größer als das Spielfeld und fängt links bei
   −PAD_X an – beides muss mitgerechnet werden, sonst liegt der getroffene Punkt daneben.
   null, wenn der Zeiger außerhalb des Spielfelds liegt. */
export function boardPos(
  svg: SVGSVGElement,
  e: { clientX: number; clientY: number },
  W: number,
  H: number,
): Pos | null {
  const { w, h } = boardExtent(W, H);
  const r = svg.getBoundingClientRect();
  const vx = ((e.clientX - r.left) / r.width) * w - PAD_X;
  const vy = ((e.clientY - r.top) / r.height) * h;
  const fx = vx / CELL - 0.5,
    fy = vy / CELL - 0.5;
  if (fx < -0.5 || fy < -0.5 || fx > W - 0.5 || fy > H - 0.5) return null;
  return { fx, fy };
}
