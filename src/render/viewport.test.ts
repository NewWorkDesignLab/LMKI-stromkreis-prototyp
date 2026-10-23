import { describe, expect, it } from "vitest";
import { MAX_SCALE, MIN_START_SCALE, fitsNaturally, panBy, startView, zoomAt } from "./viewport";

const box = { w: 900, h: 600 };

describe("Brettausschnitt", () => {
  it("zeigt ein Brett, das hineinpasst, in Originalgröße und mittig", () => {
    expect(startView({ w: 600, h: 300 }, box)).toEqual({ scale: 1, x: 150, y: 150 });
  });

  it("braucht Zoom erst, wenn das Brett in Originalgröße nicht hineinpasst", () => {
    expect(fitsNaturally({ w: 900, h: 600 }, box)).toBe(true);
    expect(fitsNaturally({ w: 901, h: 300 }, box)).toBe(false);
  });

  it("verkleinert ein zu großes Brett, bis es passt", () => {
    expect(startView({ w: 1200, h: 600 }, box).scale).toBe(0.75);
  });

  it("verkleinert nicht unter die Untergrenze – der Rest ragt heraus, mittig", () => {
    const v = startView({ w: 1800, h: 600 }, box);
    expect(v.scale).toBe(MIN_START_SCALE);
    expect(v.x).toBeCloseTo((900 - 1800 * MIN_START_SCALE) / 2);
  });

  it("behält beim Zoomen den Punkt unter dem Zeiger an seiner Stelle", () => {
    const board = { w: 600, h: 300 };
    const v = zoomAt(startView(board, box), 1.5, { x: 450, y: 300 }, board, box);
    expect(v.scale).toBe(1.5);
    /* Brettmitte (300, 150) lag unter dem Zeiger und liegt dort noch */
    expect(v.x + 300 * v.scale).toBeCloseTo(450);
    expect(v.y + 150 * v.scale).toBeCloseTo(300);
  });

  it("zoomt heraus höchstens bis zum Überblick und nie über die Obergrenze", () => {
    const board = { w: 1800, h: 600 };
    const v = startView(board, box);
    expect(zoomAt(v, 0.01, { x: 0, y: 0 }, board, box).scale).toBe(0.5);
    expect(zoomAt(v, 100, { x: 0, y: 0 }, board, box).scale).toBe(MAX_SCALE);
  });

  it("verschiebt nur so weit, dass kein leerer Rand entsteht", () => {
    const board = { w: 1800, h: 600 };
    const v = startView(board, box);
    expect(panBy(v, 5000, 0, board, box).x).toBe(0);
    expect(panBy(v, -5000, 0, board, box).x).toBeCloseTo(box.w - board.w * v.scale);
  });
});
