import { useEffect, useMemo, useRef, useState } from "react";
import type { BuildStep, Circuit, PartId } from "../../domain/types";
import { partAt, pointKey } from "../../engine/circuit";
import { activate, release, type EditContext } from "../../engine/editing";
import { boardPos } from "../../render/geometry";
import type { BoardPointerHandlers } from "../../render/Board";

/* Ein Brett zum Ansehen, an dem man Schalter und Taster bedienen darf – etwa im Merksatz,
   um die eigene Schaltung auszuprobieren. Bedienung ist genau das, was `activate` als
   „operate“ meldet; alles, was den Aufbau ändern würde (Drehen, Wert, Polung), bleibt aus.
   Der Zustand gilt nur für diese Ansicht und geht nicht zurück in den Ablauf. */
export function useOperableBoard(circuit: Circuit, board: Pick<BuildStep, "W" | "H" | "walls">) {
  const { W, H, walls } = board;
  const [live, setLive] = useState(circuit);
  const svgRef = useRef<SVGSVGElement>(null);
  const pressed = useRef<PartId | null>(null);
  const ctx: EditContext = useMemo(
    () => ({ board: { W, H, walls }, mode: "level" }),
    [W, H, walls],
  );

  /* eine andere Schaltung (etwa nach erneutem Lösen) beginnt wieder im Ausgangszustand */
  useEffect(() => setLive(circuit), [circuit]);

  const handlers: BoardPointerHandlers = {
    onPointerDown: (e) => {
      const pos = svgRef.current && boardPos(svgRef.current, e, W, H);
      if (!pos) return;
      const id = partAt(live, pointKey(Math.round(pos.fx), Math.round(pos.fy)));
      if (!id) return;
      const r = activate(live, ctx, id);
      if (r.kind !== "operate") return;
      if (r.pressed) pressed.current = r.pressed;
      setLive(r.circuit);
    },
    /* Der Taster leitet nur, solange er gedrückt ist. */
    onPointerUp: () => letGo(),
    onPointerLeave: () => letGo(),
    onPointerCancel: () => letGo(),
    onContextMenu: (e) => e.preventDefault(),
  };
  function letGo() {
    const id = pressed.current;
    if (!id) return;
    pressed.current = null;
    setLive((c) => release(c, id));
  }

  return { circuit: live, svgRef, handlers };
}
