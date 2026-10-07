/* Die Farbnamen des Spielfelds als var()-Ausdrücke (siehe tokens.ts). */
import { tokenRef } from "./tokens";

export const BG = tokenRef("bg"),
  DOT = tokenRef("dot"),
  WIRE = tokenRef("wire"),
  LIVE = tokenRef("live"),
  FLOW = tokenRef("flow"),
  BATT_PLUS = tokenRef("battPlus"),
  SWITCH_ON = tokenRef("switchOn"),
  SWITCH_OFF = tokenRef("switchOff"),
  LAMP_ON = tokenRef("lampOn"),
  LAMP_STROKE = tokenRef("lampStroke"),
  WALL = tokenRef("wall"),
  FORBID = tokenRef("forbid"),
  INK = tokenRef("ink"),
  MUTE = tokenRef("mute"),
  HOT = tokenRef("hot"),
  TUT = tokenRef("tutorial");
