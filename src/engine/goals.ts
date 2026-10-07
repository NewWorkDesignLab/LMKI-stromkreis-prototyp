import type {
  CheckItem,
  CheckResult,
  Goal,
  Grid,
  LevelDef,
  LogicExpr,
  SimResult,
} from "../domain/types";
import { cloneGrid } from "./editing";
import { CONSUMER } from "./parts";
import { simulate } from "./simulate";

/* ================= Ziele ================= */
const CNAME: Record<string, string> = {
  lamp: "Die Lampe",
  led: "Die LED",
  motor: "Der Motor",
  buzzer: "Der Summer",
};
const PLUR: Record<string, string> = {
  lamp: "Lampen",
  led: "LEDs",
  motor: "Motoren",
  buzzer: "Summer",
};
const ONW: Record<string, string> = {
  lamp: "leuchtet",
  led: "leuchtet",
  motor: "läuft",
  buzzer: "summt",
};
const ONWP: Record<string, string> = {
  lamp: "leuchten",
  led: "leuchten",
  motor: "laufen",
  buzzer: "summen",
};
const EXPR: Record<LogicExpr, (s: boolean[]) => boolean> = {
  and: (s) => s.every(Boolean),
  or: (s) => s.some(Boolean),
  xor: (s) => s.filter(Boolean).length % 2 === 1,
  id: (s) => !!s[0],
  not: (s) => !s[0],
};

export function deriveGoals(level: Pick<LevelDef, "goals">, grid: Grid): Goal[] {
  const explicit = level.goals || [];
  const covered = new Set(explicit.flatMap((g) => ("at" in g && g.at ? [g.at] : [])));
  /* gleiche Verbraucher mit gleichem Ziel zu einer Zeile zusammenfassen */
  const groups = new Map();
  for (const [k, c] of Object.entries(grid)) {
    if (!CONSUMER.has(c.type) || covered.has(k)) continue;
    const on = c.goal !== "off",
      gk = `${c.type}|${on}`;
    if (!groups.has(gk)) groups.set(gk, { k: "on", type: c.type, on, ats: [] });
    groups.get(gk).ats.push(k);
  }
  return [...groups.values(), ...explicit];
}

/* Eingänge von logic-/toggle-Zielen bedeuten „betätigt“, nicht „leitet“ – beim
   Öffner ist das gegenläufig. Ein vorangestelltes „!“ dreht den Eingang um
   („solange NICHT betätigt“). Dadurch liest sich die Zielangabe wie die Aufgabe. */
const bareKey = (k: string) => (k[0] === "!" ? k.slice(1) : k);

/* Aufbau statt Stellung: Wie sähe die Schaltung aus, wenn jeder Schalter und
   Taster geschlossen wäre? Damit lässt sich prüfen, ob ein Verbraucher
   überhaupt angeschlossen ist – auch einer, der am Ende aus bleiben soll. */
export function simulateAllClosed(grid: Grid): SimResult {
  const g2 = cloneGrid(grid);
  for (const c of Object.values(g2))
    if (c.type === "switch" || c.type === "button") c.closed = true;
  return simulate(g2);
}

export function checkLevel(
  level: Pick<LevelDef, "goals">,
  grid: Grid,
  sim: SimResult,
  seen = false,
): CheckResult {
  const goals = deriveGoals(level, grid);
  const items: CheckItem[] = [];
  /* alle Ziele, die über Schalterkombinationen geprüft werden */
  const lg = goals.filter((g) => g.k === "logic" || g.k === "toggle");
  const wsim = goals.some((g) => g.k === "wired") ? simulateAllClosed(grid) : null;
  let inputs = null,
    combos = null;
  if (lg.length) {
    inputs = [...new Set(lg.flatMap((g) => g.inputs.map(bareKey)))];
    combos = [];
    for (let m = 0; m < 1 << inputs.length; m++) {
      const g2 = cloneGrid(grid);
      const st = inputs.map((key, i) => {
        const on = !!((m >> i) & 1),
          c = g2[key];
        if (c) {
          if (c.type === "spdt") {
            c.pos = on ? 1 : 0;
            /* gekoppelte Schalter mitführen, sonst prüft das Ziel Stellungen durch,
               die es am Kreuzschalter gar nicht gibt */
            if (c.link) for (const cc of Object.values(g2)) if (cc.link === c.link) cc.pos = c.pos;
          } else c.closed = c.nc ? !on : on; // on = betätigt
        }
        return on;
      });
      combos.push({ st, sim: simulate(g2) });
    }
  }
  for (const g of goals) {
    if (g.k === "on") {
      const ats = g.ats || [g.at];
      const c = grid[ats[0]];
      if (!c) continue;
      const n = ats.length;
      const t =
        g.label ||
        (n > 1
          ? `${n === 2 ? "Beide" : `Alle ${n}`} ${PLUR[c.type]} ${g.on ? ONWP[c.type] : "bleiben aus"}`
          : `${CNAME[c.type] || "Das Bauteil"} ${g.on ? ONW[c.type] || "arbeitet" : "bleibt aus"}`);
      items.push({ t, ok: ats.every((a) => sim.lit.has(a) === g.on) });
    } else if (g.k === "wired") {
      const ats = g.ats || [g.at];
      const c = grid[ats[0]];
      if (!c) continue;
      const n = ats.length;
      items.push({
        t:
          g.label ||
          (n > 1
            ? `${n === 2 ? "Beide" : `Alle ${n}`} ${PLUR[c.type]} sind verdrahtet`
            : `${CNAME[c.type] || "Das Bauteil"} ist verdrahtet`),
        ok: ats.every((a) => wsim.lit.has(a)),
      });
    } else if (g.k === "read") {
      const cand = g.at ? [g.at] : Object.keys(grid).filter((k) => grid[k].type === g.type);
      const ok = cand.some((k) => {
        const v = Math.abs((grid[k].type === "voltmeter" ? sim.volt[k] : sim.cur[k]) || 0);
        return v >= g.min && v <= g.max;
      });
      items.push({ t: g.label, ok });
    } else if (g.k === "logic") {
      const ix = g.inputs.map((key) => [inputs.indexOf(bareKey(key)), key[0] === "!"]);
      /* live: zusätzlich muss die Schaltung gerade wirklich durchgeschaltet sein */
      const ok =
        combos.every(
          (cb) =>
            !cb.sim.short &&
            cb.sim.lit.has(g.at) ===
              !!EXPR[g.expr](ix.map(([i, inv]) => (inv ? !cb.st[i] : cb.st[i]))),
        ) &&
        (!g.live || sim.lit.has(g.at));
      items.push({ t: g.label, ok });
    } else if (g.k === "toggle") {
      /* Umschalt-Eigenschaft: jeder einzelne Schalter kehrt den Zustand um.
         Erfüllt sowohl die XOR- als auch die XNOR-Verdrahtung. */
      const ix = g.inputs.map((key) => inputs.indexOf(bareKey(key)));
      const ok = combos.every(
        (cb, m) =>
          !cb.sim.short &&
          ix.every((i) => {
            const other = combos[m ^ (1 << i)];
            return cb.sim.lit.has(g.at) !== other.sim.lit.has(g.at);
          }),
      );
      items.push({ t: g.label, ok });
    } else if (g.k === "state") {
      /* Stellungen im Jetzt, wieder als „betätigt“ – beim Öffner also closed === false. */
      const ok = Object.entries(g.pressed).every(([k, want]) => {
        const c = grid[k];
        return c ? (c.nc ? !c.closed : !!c.closed) === want : false;
      });
      items.push({ t: g.label, ok });
    } else if (g.k === "seen") {
      /* War im Laufe des Versuchs schon einmal so (siehe `latch` am Level).
         Nötig, wo die Reihenfolge zählt und nicht nur der Endzustand. */
      items.push({ t: g.label, ok: seen });
    } else if (g.k === "fuse") {
      items.push({
        t: g.label || "Die Sicherung hält",
        ok: sim.tripped.size === 0,
      });
    }
  }
  if (sim.short) items.push({ t: "Kein Kurzschluss", ok: false });
  if (sim.overload.size) items.push({ t: "Kein Bauteil überlastet", ok: false });
  return { items, won: items.length > 0 && items.every((i) => i.ok) };
}
