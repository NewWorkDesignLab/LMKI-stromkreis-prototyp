import type {
  Attempt,
  CheckItem,
  CheckResult,
  Circuit,
  Goal,
  BuildStep,
  LogicExpr,
  MeasureUnit,
  PartId,
  PartType,
  SimResult,
  Tried,
  TryCue,
} from "../domain/types";
import { cloneCircuit } from "./circuit";
import { fmtA, fmtV, shownA, shownV } from "./format";
import { CONSUMER, actuated } from "./parts";
import { exact, parsePlainNumber, withinTolerance } from "./quantity";
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

const UNIT_FACTOR: Record<MeasureUnit, number> = { A: 1, mA: 1e-3, V: 1, mV: 1e-3 };

/* Der Wert, den man vom Messgerät ablesen und in der Einheit der Aufgabe eintragen muss: die
   Anzeige (gerundet wie am Gerät), umgerechnet in `unit` (0,099 / 0,001 ohne Gleitkommarest). */
export function expectedReading(g: Extract<Goal, { k: "measure" }>, measured: number): number {
  const base = g.quantity === "current" ? shownA(measured) : shownV(measured);
  return exact(base / UNIT_FACTOR[g.unit]);
}

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

export interface MeasuredResult {
  /** ID des Messziels */
  id: string;
  quantity: Extract<Goal, { k: "measure" }>["quantity"];
  /** so, wie das Messgerät es anzeigt („47 mA“) */
  shown: string;
  /** der richtige Eintrag in der Einheit der Aufgabe („47“, „0,047“) */
  reading: string;
}

/* Die Messungen eines Aufbaus im Rückblick (Merksatz-Schritt). Eigene Eingaben werden nicht
   aufgehoben, deshalb liest die Rückschau ab, was das Messgerät zeigt. Messziele, für die
   kein Messgerät richtig sitzt, fehlen – etwa wenn statt der eigenen Schaltung eine andere
   gezeigt wird. */
export function measuredResults(
  level: Pick<BuildStep, "goals">,
  circuit: Circuit,
  sim: SimResult = simulate(circuit),
): MeasuredResult[] {
  const out: MeasuredResult[] = [];
  for (const g of level.goals ?? []) {
    if (g.k !== "measure") continue;
    const v = measuredValue(g, circuit, sim);
    if (v === null) continue;
    out.push({
      id: g.id,
      quantity: g.quantity,
      shown: g.quantity === "current" ? fmtA(v) : fmtV(v),
      reading: String(expectedReading(g, v)),
    });
  }
  return out;
}

type LogicGoal = Extract<Goal, { k: "logic" }>;
interface Combo {
  /** je Eingang: betätigt */
  st: boolean[];
  sim: SimResult;
}

/* Alle Stellungen der Eingänge durchsimuliert – so prüfen Logik-Ziele die Verdrahtung und
   nicht nur den Jetztzustand. */
function switchCombos(circuit: Circuit, inputs: PartId[]): Combo[] {
  const combos: Combo[] = [];
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
  return combos;
}

/** Folgt die Lampe in jeder Stellung dem Ausdruck? `inputs` ist die Eingangsliste der Combos. */
function logicWired(g: LogicGoal, inputs: PartId[], combos: Combo[]): boolean {
  const ix = g.inputs.map((key) => [inputs.indexOf(bareKey(key)), key[0] === "!"] as const);
  return combos.every(
    (cb) =>
      !cb.sim.short &&
      cb.sim.lit.has(g.at) === !!EXPR[g.expr](ix.map(([i, inv]) => (inv ? !cb.st[i] : cb.st[i]))),
  );
}

export function checkLevel(
  level: Pick<BuildStep, "goals">,
  circuit: Circuit,
  sim: SimResult,
  { seen = false, readings = {}, tried = {}, operated = new Set() }: Partial<Attempt> = {},
): CheckResult {
  const parts = circuit.parts;
  const goals = deriveGoals(level, circuit);
  const items: CheckItem[] = [];
  /* alle Ziele, die über Schalterkombinationen geprüft werden */
  const lg = goals.filter((g) => g.k === "logic" || g.k === "toggle");
  const wsim = goals.some((g) => g.k === "wired") ? simulateAllClosed(circuit) : null;
  const inputs = [...new Set(lg.flatMap((g) => g.inputs.map(bareKey)))];
  const combos = lg.length ? switchCombos(circuit, inputs) : [];
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
      const measured = measuredValue(g, circuit, sim);
      /* Nur die Zahl, in der Einheit am Eingabefeld – ohne Toleranz: 98 mA ist nicht 99 mA. */
      const typed = parsePlainNumber(readings[g.id] ?? "");
      const ok = measured !== null && typed !== null && typed === expectedReading(g, measured);
      items.push({ t: g.label, ok, measure: { id: g.id, unit: g.unit } });
    } else if (g.k === "logic") {
      /* live: zusätzlich muss die Schaltung gerade wirklich durchgeschaltet sein */
      const ok =
        logicWired(g, inputs, combos) &&
        (!g.live || sim.lit.has(g.at)) &&
        (!g.operated || g.inputs.every((key) => operated.has(bareKey(key))));
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
        return c ? actuated(c) === want : false;
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
    } else if (g.k === "tried") {
      items.push({ t: g.label, ok: g.ats.every((id) => tried[id] === 2), tried: true });
    }
  }
  if (sim.short) items.push({ t: "Kein Kurzschluss", ok: false });
  if (sim.overload.size) items.push({ t: "Kein Bauteil überlastet", ok: false });
  return { items, won: items.length > 0 && items.every((i) => i.ok) };
}

/** Die Taster, die die Ausprobieren-Ziele eines Levels verlangen. */
export const triedParts = (level: Pick<BuildStep, "goals">): PartId[] => [
  ...new Set((level.goals ?? []).flatMap((g) => (g.k === "tried" ? g.ats : []))),
];

/** Alle Ziele außer dem Ausprobieren erreicht: erst dann zählen Betätigungen. */
export const othersMet = (check: CheckResult): boolean => check.items.every((i) => i.ok || i.tried);

/* Ausprobieren zählt nur Betätigungen in der Funktionsansicht, gemeldet im Handler. Die
   Reihenfolge der Taster ist egal; einmal losgelassen bleibt losgelassen. Ohne Änderung kommt
   dasselbe Objekt zurück. */

/** Taster in der Funktionsansicht gedrückt */
export const tryPress = (tried: Tried, id: PartId): Tried =>
  tried[id] ? tried : { ...tried, [id]: 1 };

/** Taster in der Funktionsansicht losgelassen */
export const tryRelease = (tried: Tried, id: PartId): Tried =>
  tried[id] === 1 ? { ...tried, [id]: 2 } : tried;

/** Was der Taster `id` als Nächstes verlangt. Solange ein anderer gedrückt ist, wartet er –
    so ist immer nur der Taster dran, an dem gerade etwas zu tun ist. */
export const tryCue = (tried: Tried, id: PartId): TryCue => {
  if (tried[id] === 2) return "done";
  if (tried[id] === 1) return "release";
  return Object.values(tried).includes(1) ? "wait" : "press";
};

/** Solange die übrigen Ziele offen sind, beginnt das Ausprobieren von vorn – ein Drücken an
    der halb verdrahteten Schaltung gälte sonst. */
export const keepTried = (tried: Tried, check: CheckResult): Tried =>
  othersMet(check) || !Object.keys(tried).length ? tried : {};

/** Eingänge von Logik-Zielen mit `operated`, die betätigt wurden, während ihr Ziel verdrahtet
    war; `last` ist die zuletzt gesehene Schaltung. Betätigt heißt: in die betätigte Stellung
    gebracht – ein Schalter, der schon geschlossen lag, zählt erst nach erneutem Schalten. */
export interface Operated {
  last: Circuit;
  ids: ReadonlySet<PartId>;
}

export const startOperated = (circuit: Circuit): Operated => ({ last: circuit, ids: new Set() });

const isActuated = (c: Circuit, id: PartId) => {
  const p = c.parts[id];
  return !!p && (p.type === "button" || p.type === "switch") && actuated(p);
};

/** Nach einer Änderung der Schaltung. Je Ziel gilt: stimmt seine Verdrahtung nicht mehr,
    ist das Betätigen seiner Eingänge vergessen; stimmt sie, kommt hinzu, was eben betätigt
    wurde. Wer danach den nächsten Zweig verdrahtet, behält das schon Gesehene. Steckt ein
    Eingang in mehreren solchen Zielen, müssen alle verdrahtet sein. */
export function advanceOperated(
  o: Operated,
  level: Pick<BuildStep, "goals">,
  circuit: Circuit,
): Operated {
  if (circuit === o.last) return o;
  const unwired = new Set<PartId>(),
    pressed = new Set<PartId>();
  for (const g of level.goals ?? []) {
    if (g.k !== "logic" || !g.operated) continue;
    const inputs = g.inputs.map(bareKey);
    const target = logicWired(g, inputs, switchCombos(circuit, inputs)) ? pressed : unwired;
    for (const id of inputs) target.add(id);
  }
  const ids = new Set(o.ids);
  for (const id of unwired) ids.delete(id);
  for (const id of pressed)
    if (!unwired.has(id) && isActuated(circuit, id) && !isActuated(o.last, id)) ids.add(id);
  const same = ids.size === o.ids.size && [...ids].every((id) => o.ids.has(id));
  return { last: circuit, ids: same ? o.ids : ids };
}
