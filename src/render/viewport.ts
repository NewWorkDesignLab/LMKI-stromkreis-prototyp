/* Ausschnitt des Bretts im Fenster: Maßstab (Bildpunkte je SVG-Einheit) und Lage der
   linken oberen Brettecke im Rahmen. Reine Rechnung – die Komponente hält nur den
   Zustand und reicht Rad- und Ziehereignisse herein. */

export interface Size {
  w: number;
  h: number;
}
export interface View {
  scale: number;
  x: number;
  y: number;
}

/* 100 % = ein Bildpunkt je SVG-Einheit, also 60 px je Rasterpunkt (CELL) – die Größe des
   Prototyps, die sich bewährt hat. Größer wird ein Brett nie von selbst. */
export const NATURAL_SCALE = 1;
/* Passt ein Brett nicht in den Rahmen, wird es höchstens bis hierher verkleinert (42 px je
   Punkt); darunter werden Messwerte und Beschriftungen schwer lesbar. Was dann noch
   übersteht, ragt heraus und wird verschoben. */
export const MIN_START_SCALE = 0.7;
/* Hineinzoomen bis 120 px je Punkt; mehr bringt beim Verdrahten nichts. */
export const MAX_SCALE = 2;

/* Rand zwischen Brett und Rahmen in Bildpunkten, wenn der Rahmen sich nach dem Brett
   richtet: genug Luft, dass Beschriftungen am Rand nicht an der Kante kleben. */
export const FRAME_PAD = 16;

/** Passt das Brett in Originalgröße in den Rahmen? Sonst braucht es Zoom und Verschieben. */
export const fitsNaturally = (content: Size, box: Size) =>
  content.w * NATURAL_SCALE <= box.w && content.h * NATURAL_SCALE <= box.h;

/** Maßstab, bei dem das ganze Brett in den Rahmen passt. */
const fitScale = (content: Size, box: Size) => Math.min(box.w / content.w, box.h / content.h);

/** Kleinster Maßstab beim Herauszoomen: ganzer Überblick, aber nie größer als 100 %. */
export const minScale = (content: Size, box: Size) =>
  Math.min(fitScale(content, box), NATURAL_SCALE);

/* Liegt das Brett in einer Richtung ganz im Rahmen, steht es dort mittig; ist es größer,
   darf es nur so weit verschoben werden, dass kein leerer Rand entsteht. */
export function clampView(v: View, content: Size, box: Size): View {
  const axis = (pos: number, len: number, room: number) =>
    len <= room ? (room - len) / 2 : Math.min(0, Math.max(room - len, pos));
  return {
    scale: v.scale,
    x: axis(v.x, content.w * v.scale, box.w),
    y: axis(v.y, content.h * v.scale, box.h),
  };
}

/** Ausgangsansicht: 100 %, wenn es passt, sonst verkleinert bis MIN_START_SCALE, mittig. */
export function startView(content: Size, box: Size): View {
  const scale = Math.max(MIN_START_SCALE, Math.min(NATURAL_SCALE, fitScale(content, box)));
  const x = (box.w - content.w * scale) / 2,
    y = (box.h - content.h * scale) / 2;
  return clampView({ scale, x, y }, content, box);
}

/** Zoomt um `factor`, wobei der Punkt `at` (Rahmenkoordinaten) an seiner Stelle bleibt. */
export function zoomAt(
  v: View,
  factor: number,
  at: { x: number; y: number },
  content: Size,
  box: Size,
): View {
  const scale = Math.min(MAX_SCALE, Math.max(minScale(content, box), v.scale * factor));
  const k = scale / v.scale;
  return clampView({ scale, x: at.x - (at.x - v.x) * k, y: at.y - (at.y - v.y) * k }, content, box);
}

export function panBy(v: View, dx: number, dy: number, content: Size, box: Size): View {
  return clampView({ ...v, x: v.x + dx, y: v.y + dy }, content, box);
}
