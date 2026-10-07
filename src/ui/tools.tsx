import type { ComponentType } from "react";
import {
  Activity,
  Battery,
  Bell,
  Cable,
  CircleDot,
  Eraser,
  Fan,
  GitFork,
  Gauge,
  Lightbulb,
  Shield,
  ToggleRight,
  X,
} from "lucide-react";
import type { ToolId } from "../domain/types";
import { LedIcon, OpenerIcon, ResIcon } from "../render/symbols";

/* Anzeige der Werkzeuge: Symbol und Beschriftung. Welche Werkzeuge es gibt und
   wo sie wirken, steht in engine/editing.ts. */
export const TOOLS: Record<
  ToolId,
  { icon: ComponentType<{ size?: number | string }>; label: string }
> = {
  wire: { icon: Cable, label: "Verdrahten" },
  cross: { icon: X, label: "Kreuzung" },
  switch: { icon: ToggleRight, label: "Schalter" },
  opener: { icon: OpenerIcon, label: "Öffner" },
  button: { icon: CircleDot, label: "Taster" },
  spdt: { icon: GitFork, label: "Wechselschalter" },
  lamp: { icon: Lightbulb, label: "Lampe" },
  led: { icon: LedIcon, label: "LED" },
  resistor: { icon: ResIcon, label: "Widerstand" },
  motor: { icon: Fan, label: "Motor" },
  buzzer: { icon: Bell, label: "Summer" },
  fuse: { icon: Shield, label: "Sicherung" },
  ammeter: { icon: Activity, label: "Amperemeter" },
  voltmeter: { icon: Gauge, label: "Voltmeter" },
  battery: { icon: Battery, label: "Spannungsquelle" },
  erase: { icon: Eraser, label: "Löschen" },
};

/* Ausgewähltes Werkzeug: dunkle Tinten-Umrandung. Heller Grund bleibt, damit die
   Symbol-Vorschau lesbar ist; kein Cyan, das gehört der Tutorial-Animation. */
export const toolTileStyle = (active: boolean) =>
  active
    ? "bg-white border-stone-800 text-stone-900 ring-1 ring-stone-800"
    : "bg-white border-stone-200 text-stone-600 hover:border-stone-400";
