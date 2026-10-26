import type {
  CheckItem,
  CheckResult,
  Circuit,
  Goal,
  BuildStep,
  LogicExpr,
  PartType,
  Readings,
  SimResult,
} from "../domain/types";
import { cloneCircuit } from "./circuit";
import { fmtA, fmtV } from "./format";
import { CONSUMER } from "./parts";
import { parseQuantity, withinTolerance } from "./quantity";
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

export function deriveGoals(level: Pick<BuildStep, "goals">, circuit: Circuit): Goal[] {
  const explicit = level.goals || [];
  const covered = new Set(explicit.flatMap((g) => ("at" in g && g.at ? [g.at] : [])));
  /* gleiche Verbraucher mit gleichem Ziel zu einer Zeile zusammenfassen */
  const groups = new Map<string, { k: "on"; type: PartType; on: boolean; ats: string[] }>();
  for (const [k, c] of Object.entries(circuit.parts)) {
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
export function simulateAllClosed(circuit: Circuit): SimResult {
  const c2 = cloneCircuit(circuit);
  for (const c of Object.values(c2.parts))
    if (c.type === "switch" || c.type === "button") c.closed = true;
  return simulate(c2);
}

const MEASURE_UNIT = { current: "A", voltage: "V" } as const;

/* Was zeigt ein Messgerät, das die Größe an `of` misst? null, wenn keines so sitzt. Erkannt
   wird das am Wert: Ein Amperemeter in Reihe führt genau den Strom von `of`, ein Voltmeter
   parallel liegt an genau dessen Spannung. Bewusste Grenze: Gleiche Werte in einem anderen
   Zweig (zwei gleiche Lampen parallel) gelten auch – physikalisch käme dasselbe heraus. */
export function measuredValue(
  g: Extract<Goal, { k: "measure" }>,
  circuit: Circuit,
  sim: SimResult,
): number | null {
  const [meter, table] =
    g.quantity === "current" ? (["ammeter", sim.cur] as const) : (["voltmeter", sim.volt] as const);
  const target = Math.abs(table[g.of] || 0);
  if (target === 0) return null;
  const hit = Object.keys(circuit.parts).some(
    (k) =>
      circuit.parts[k].type === meter && withinTolerance(Math.abs(table[k] || 0), target, 1e-6),
  );
  return hit ? target : null;
}

/* Die Ziele eines gelösten Aufbaus im Rückblick (Merksatz-Schritt). Eigene Eingaben werden
   nicht aufgehoben, deshalb liest die Rückschau Messwerte so ab, wie das Messgerät sie zeigt,
   und nennt sie im Text. Ziele, die der Aufbau nicht (mehr) erfüllt, bleiben offen – etwa wenn
   statt der eigenen Schaltung die Musterlösung gezeigt wird. `seen` gilt als erreicht: wer
   den Schritt gelöst hat, hat die Reihenfolge eingehalten. */
export function reviewGoals(level: Pick<BuildStep, "goals">, circuit: Circuit): CheckItem[] {
  const sim = simulate(circuit);
  const readings: Readings = {};
  const shown: Record<string, string> = {};
  for (const g of level.goals ?? []) {
    if (g.k !== "measure") continue;
    const v = measuredValue(g, circuit, sim);
    if (v === null) continue;
    readings[g.id] = String(v);
    shown[g.id] = g.quantity === "current" ? fmtA(v) : fmtV(v);
  }
  return checkLevel(level, circuit, sim, true, readings).items.map((it) =>
    it.measure && shown[it.measure.id] ? { ...it, t: `${it.t}: ${shown[it.measure.id]}` } : it,
  );
}

export function checkLevel(
  level: Pick<BuildStep, "goals">,
  circuit: Circuit,
  sim: SimResult,
  seen = false,
  readings: Readings = {},
): CheckResult {
  const parts = circuit.parts;
  const goals = deriveGoals(level, circuit);
  const items: CheckItem[] = [];
  /* alle Ziele, die über Schalterkombinationen geprüft werden */
  const lg = goals.filter((g) => g.k === "logic" || g.k === "toggle");
  const wsim = goals.some((g) => g.k === "wired") ? simulateAllClosed(circuit) : null;
  let inputs = null,
    combos = null;
  if (lg.length) {
    inputs = [...new Set(lg.flatMap((g) => g.inputs.map(bareKey)))];
    combos = [];
    for (let m = 0; m < 1 << inputs.length; m++) {
      const c2 = cloneCircuit(circuit);
      const st = inputs.map((key, i) => {
        const on = !!((m >> i) & 1),
          c = c2.parts[key];
        if (c) {
          if (c.type === "spdt") {
            c.pos = on ? 1 : 0;
            /* gekoppelte Schalter mitführen, sonst prüft das Ziel Stellungen durch,
               die es am Kreuzschalter gar nicht gibt */
            if (c.link)
              for (const cc of Object.values(c2.parts)) if (cc.link === c.link) cc.pos = c.pos;
          } else c.closed = c.nc ? !on : on; // on = betätigt
        }
        return on;
      });
      combos.push({ st, sim: simulate(c2) });
    }
  }
  for (const g of goals) {
    if (g.k === "on") {
      const ats = g.ats || [g.at];
      const c = parts[ats[0]];
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
      const c = parts[ats[0]];
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
      const cand = g.at ? [g.at] : Object.keys(parts).filter((k) => parts[k].type === g.type);
      const ok = cand.some((k) => {
        const v = Math.abs((parts[k]?.type === "voltmeter" ? sim.volt[k] : sim.cur[k]) || 0);
        return v >= g.min && v <= g.max;
      });
      items.push({ t: g.label, ok });
    } else if (g.k === "measure") {
      const shown = measuredValue(g, circuit, sim);
      const typed = parseQuantity(readings[g.id] ?? "", MEASURE_UNIT[g.quantity]);
      const ok = shown !== null && "value" in typed && withinTolerance(typed.value, shown);
      items.push({ t: g.label, ok, measure: { id: g.id, unit: MEASURE_UNIT[g.quantity] } });
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
        const c = parts[k];
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
