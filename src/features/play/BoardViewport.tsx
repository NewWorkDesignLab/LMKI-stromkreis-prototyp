import { Maximize, ZoomIn, ZoomOut } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { BG } from "../../theme/colors";
import {
  FRAME_PAD,
  MAX_SCALE,
  NATURAL_SCALE,
  clampView,
  fitsNaturally,
  minScale,
  panBy,
  startView,
  zoomAt,
  type Size,
  type View,
} from "../../render/viewport";

interface Props {
  /** Ausdehnung des Bretts in SVG-Einheiten (boardExtent) */
  content: Size;
  /** füllt den verfügbaren Platz (freies Bauen); sonst so groß wie das Brett */
  fill?: boolean;
  /** Ziele erreicht: der Rahmen leuchtet einmal auf (Klasse board-solved) */
  solved?: boolean;
  /** schwebende Leiste oben links (ToolBar); bekommt ein eigenes Band über dem Brett */
  toolbar?: ReactNode;
  /** zeichnet das Brett in der übergebenen Größe (Bildpunkte) */
  children: (size: { width: number; height: number }) => ReactNode;
}

/* Mausrad: Zoomfaktor je Rad-Einheit. 100 Einheiten (eine Raste der meisten Mäuse)
   ergeben rund 16 % – fein genug für Trackpads, ohne dass man an der Maus endlos dreht. */
const WHEEL_ZOOM = 0.0015;
/* Zoomknöpfe: ein Druck = Faktor 1,25, nach vier Drücken etwa doppelt so groß. */
const BUTTON_ZOOM = 1.25;
/* Höhe des Bands für die Werkzeugleiste in Bildpunkten: 8 px Abstand zum Rahmen, 44 px
   Knopf (Tastfläche) plus 2 × 3 px Polster und Rand der Leiste. Das Brett beginnt darunter,
   damit die Leiste nie einen Rasterpunkt verdeckt – auch nicht beim Verschieben. */
const TOOLBAR_BAND = 58;

/** Mindesthöhe des Rahmens im Level: bis hierhin schrumpft er, danach scrollt die Spalte. */
export const FRAME_MIN_H = "min-h-[16rem]";

export const TOOL_BUTTON =
  "flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:pointer-events-none disabled:opacity-35";

/* Das Brett im Rahmen. Im Level ist der Rahmen so groß wie das Brett in Originalgröße:
   ein kleines Level bleibt klein und mittig, statt in einer leeren Fläche zu stehen.
   Zoom und Verschieben gibt es erst, wenn das Brett nicht hineinpasst (große Level,
   schmales Fenster) oder im freien Bauen – dann mit dem Mausrad, gedrückter Leertaste
   oder mittlerer Maustaste. Linke und rechte Maustaste bleiben dem Brett. Gemessen und
   gezoomt wird nur das Feld unter dem Band der Werkzeugleiste. */
export function BoardViewport({ content, fill = false, solved = false, toolbar, children }: Props) {
  const band = toolbar ? TOOLBAR_BAND : 0;
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Size>({ w: 0, h: 0 });
  /* null = Ausgangsansicht: folgt jeder Größenänderung des Fensters */
  const [manual, setManual] = useState<View | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const pan = useRef<{ x: number; y: number } | null>(null);
  const hovered = useRef(false);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setBox({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = box.w > 0 && box.h > 0;
  const view = manual ? clampView(manual, content, box) : startView(content, box);
  const zoomable = fill || manual !== null || (ready && !fitsNaturally(content, box));
  const live = useRef({ view, content, box, zoomable });
  live.current = { view, content, box, zoomable };

  /* Das Rad braucht einen nicht-passiven Zuhörer, sonst scrollt die Seite mit. Passt das
     Brett, gehört das Rad der Seite. */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { view: v, content: c, box: b, zoomable: z } = live.current;
      if (!z) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const at = { x: e.clientX - r.left, y: e.clientY - r.top };
      setManual(zoomAt(v, Math.exp(-e.deltaY * WHEEL_ZOOM), at, c, b));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* Leertaste hält die Hand, solange der Zeiger über dem Brett ist – sonst gehört sie
     wie gewohnt dem fokussierten Knopf. */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !hovered.current || !live.current.zoomable) return;
      e.preventDefault();
      setSpaceHeld(true);
    };
    const up = (e: KeyboardEvent) => e.code === "Space" && setSpaceHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /* In der Einfangphase, damit das Brett darunter die Geste gar nicht erst sieht. */
  const onPointerDownCapture = (e: PointerEvent<HTMLDivElement>) => {
    if (!zoomable || (e.button !== 1 && !(spaceHeld && e.button === 0))) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    pan.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMoveCapture = (e: PointerEvent<HTMLDivElement>) => {
    const p = pan.current;
    if (!p) return;
    e.stopPropagation();
    setManual(panBy(view, e.clientX - p.x, e.clientY - p.y, content, box));
    pan.current = { x: e.clientX, y: e.clientY };
  };
  const endPan = () => {
    pan.current = null;
  };

  const zoomCenter = (f: number) =>
    setManual(zoomAt(view, f, { x: box.w / 2, y: box.h / 2 }, content, box));
  /* 100 % ist die Originalgröße, nicht „passt genau“ – so bedeutet die Zahl in jedem
     Level dasselbe. */
  const percent = Math.round((view.scale / NATURAL_SCALE) * 100);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border transition-colors ${solved ? "board-solved border-emerald-300" : "border-stone-200"} ${fill ? "min-h-[24rem] flex-1" : `${FRAME_MIN_H} shrink`}`}
      style={{
        background: BG,
        /* Originalgröße samt Rand und Band; reicht der Platz nicht, schrumpft der Rahmen,
           und das Brett wird verkleinert bzw. verschoben. */
        height: fill ? undefined : content.h * NATURAL_SCALE + 2 * FRAME_PAD + band,
      }}
    >
      {toolbar && <div className="absolute left-2 top-2 z-10">{toolbar}</div>}
      <div
        ref={boxRef}
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        style={{ top: band, cursor: spaceHeld ? "grab" : undefined }}
        onPointerEnter={() => (hovered.current = true)}
        onPointerLeave={() => (hovered.current = false)}
        onPointerDownCapture={onPointerDownCapture}
        onPointerMoveCapture={onPointerMoveCapture}
        onPointerUpCapture={endPan}
        onPointerCancelCapture={endPan}
      >
        {ready && (
          <div
            className="absolute left-0 top-0"
            style={{
              transform: `translate(${view.x}px, ${view.y}px)`,
              pointerEvents: spaceHeld ? "none" : undefined,
            }}
          >
            {children({ width: content.w * view.scale, height: content.h * view.scale })}
          </div>
        )}
        {zoomable && (
          <div
            role="group"
            aria-label="Ansicht"
            className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-xl border border-stone-200 bg-white/95 p-0.5 shadow-sm"
          >
            <button
              type="button"
              onClick={() => zoomCenter(1 / BUTTON_ZOOM)}
              aria-label="Verkleinern"
              title="Verkleinern (Mausrad)"
              className={TOOL_BUTTON}
              disabled={view.scale <= minScale(content, box)}
            >
              <ZoomOut size={17} />
            </button>
            <span
              className="w-11 text-center text-xs tabular-nums text-stone-500"
              aria-live="polite"
            >
              {percent} %
            </span>
            <button
              type="button"
              onClick={() => zoomCenter(BUTTON_ZOOM)}
              aria-label="Vergrößern"
              title="Vergrößern (Mausrad)"
              className={TOOL_BUTTON}
              disabled={view.scale >= MAX_SCALE}
            >
              <ZoomIn size={17} />
            </button>
            <button
              type="button"
              onClick={() => setManual(null)}
              disabled={!manual}
              aria-label="Startansicht"
              title="Zurück zur Ausgangsansicht – verschieben mit Leertaste oder mittlerer Maustaste"
              className={TOOL_BUTTON}
            >
              <Maximize size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
