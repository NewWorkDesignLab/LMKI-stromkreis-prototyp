import {
  CONSUMER,
  EPS,
  P,
  TWO,
  IDEAL,
  hasPort,
  portNode,
  sidesOf,
  spdtOuts,
  wireNode,
} from "./parts";
import { OPPOSITE, partIndex, sideTowards, wireEnds } from "./circuit";
import type { Circuit, Part, PartId, PointKey, Side, SimResult, WireKey } from "../domain/types";

/* Leitungsstück zwischen zwei Anschlussknoten */
interface Seg {
  key: WireKey;
  a: PointKey;
  b: PointKey;
  na: string;
  nb: string;
}
/* Bauteil als Zweipol zwischen den Knoten a und b */
interface El {
  key: PartId;
  type: Part["type"];
  cell: Part;
  a: string;
  b: string;
}
/* Norton-Stempel: Leitwert g zwischen a und b, Stromquelle i */
interface Stamp {
  a: string;
  b: string;
  g: number;
  i: number;
  el: El;
}

/* Gauß-Jordan mit Spaltenpivot auf einer erweiterten Matrix (n × n+1), in place.
   Singuläre Spalten werden übersprungen; ihre Unbekannte gilt danach als 0. */
function solveInPlace(A: Float64Array[], n: number): number[] {
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    if (Math.abs(A[piv][col]) < 1e-14) continue;
    if (piv !== col) {
      const t = A[piv];
      A[piv] = A[col];
      A[col] = t;
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      if (!f) continue;
      for (let cc = col; cc <= n; cc++) A[r][cc] -= f * A[col][cc];
    }
  }
  return Array.from({ length: n }, (_, i) => (Math.abs(A[i][i]) < 1e-14 ? 0 : A[i][n] / A[i][i]));
}

/* Zusammenhangskomponenten eines ungerichteten Graphen über seine Nachbarlisten. */
function components<T>(nodes: Iterable<T>, nbr: (n: T) => Iterable<T>): T[][] {
  const seen = new Set<T>(),
    out: T[][] = [];
  for (const start of nodes) {
    if (seen.has(start)) continue;
    const comp = [start];
    seen.add(start);
    for (let q = 0; q < comp.length; q++)
      for (const m of nbr(comp[q]))
        if (!seen.has(m)) {
          seen.add(m);
          comp.push(m);
        }
    out.push(comp);
  }
  return out;
}

/* ================= Simulation =================
   Zwei Sichten auf dieselbe Schaltung:
   – ein Gleichstrom-Löser (Knotenpotentialverfahren) für echte Ströme und Spannungen
   – der topologische Erreichbarkeitstest von + nach − dafür, was überhaupt Strom führt
   – die Flussrichtung der Animation folgt den gerechneten Strömen, also immer + nach −   */
export function simulate(circuit: Circuit): SimResult {
  const res: SimResult = {
    hasBattery: false,
    closed: false,
    short: false,
    ibatt: 0,
    ubatt: 0,
    wires: {},
    points: {},
    crossLive: {},
    glow: new Set(),
    lit: new Set(),
    bright: {},
    cur: {},
    volt: {},
    tripped: new Set(),
    overload: new Set(),
    blocked: new Set(),
  };
  const at = partIndex(circuit);

  /* --- Leitungen: nur Kanten, deren beide Enden dort einen Anschluss haben --- */
  const portAt = (p: PointKey, side: Side): string | null => {
    const id = at.get(p);
    if (!id) return wireNode(p);
    const part = circuit.parts[id];
    return hasPort(part, side) ? portNode(part, side, id) : null;
  };
  const segs: Seg[] = [];
  for (const key of Object.keys(circuit.wires)) {
    const [a, b] = wireEnds(key);
    const s = sideTowards(a, b);
    const na = s && portAt(a, s),
      nb = s && portAt(b, OPPOSITE[s]);
    res.wires[key] = { live: false, dir: 0 };
    if (!na || !nb) continue; // endet an einer Bauteilseite ohne Anschluss: leitet nicht
    segs.push({ key, a, b, na, nb });
  }
  for (const s of segs)
    for (const p of [s.a, s.b])
      if (!at.has(p)) {
        const st = (res.points[p] ??= { deg: 0, live: false });
        st.deg++;
      }

  /* --- Bauteile als Zweipole --- */
  const els: El[] = [];
  for (const [key, c] of Object.entries(circuit.parts)) {
    if (c.type === "battery") {
      let plus: Side = c.orient === "h" ? "E" : "N",
        minus: Side = c.orient === "h" ? "W" : "S";
      if (c.rev) [plus, minus] = [minus, plus];
      els.push({
        key,
        type: c.type,
        cell: c,
        a: portNode(c, plus, key),
        b: portNode(c, minus, key),
      });
    } else if (c.type === "spdt") {
      const outs = spdtOuts(c);
      els.push({
        key,
        type: c.type,
        cell: c,
        a: portNode(c, c.dir, key),
        b: portNode(c, outs[c.pos ? 1 : 0], key),
      });
    } else if (TWO.has(c.type)) {
      const [s1, s2] = sidesOf(c);
      let a = portNode(c, s1, key),
        b = portNode(c, s2, key);
      if (c.rev) [a, b] = [b, a]; // LED-Polung
      els.push({ key, type: c.type, cell: c, a, b });
    }
  }
  const batts = els.filter((e) => e.type === "battery");
  res.hasBattery = batts.length > 0;

  /* --- Knoten verschmelzen: Leitungen und geschlossene ideale Schalter --- */
  const par = new Map<string, string>();
  const find = (a: string): string => {
    if (!par.has(a)) par.set(a, a);
    let r = a;
    while (par.get(r) !== r) r = par.get(r);
    while (par.get(a) !== r) {
      const n = par.get(a);
      par.set(a, r);
      a = n;
    }
    return r;
  };
  const uni = (a: string, b: string) => {
    const ra = find(a),
      rb = find(b);
    if (ra !== rb) par.set(ra, rb);
  };
  for (const s of segs) uni(s.na, s.nb);
  for (const e of els) {
    if (e.type === "spdt") uni(e.a, e.b);
    else if ((e.type === "switch" || e.type === "button") && e.cell.closed) uni(e.a, e.b);
  }

  if (!batts.length) return res;

  /* --- Stempel: Leitwert g zwischen a und b, Stromquelle i (Norton) --- */
  /* Eine ausgelöste Sicherung bleibt offen, bis sie von Hand eingeschaltet wird
     (cell.open). Sie ist damit der einzige Bauteilzustand, den die Simulation
     zurück in die Schaltung schreibt – siehe latchTripped in usePlaySession. */
  const fuseOpen: Record<PartId, boolean> = {},
    ledOn: Record<PartId, boolean> = {};
  for (const e of els) {
    if (e.type === "led") ledOn[e.key] = true;
    if (e.type === "fuse" && e.cell.open) fuseOpen[e.key] = true;
  }

  const stamps = (): Stamp[] => {
    const st: Stamp[] = [];
    for (const e of els) {
      const c = e.cell,
        A = find(e.a),
        B = find(e.b);
      if (IDEAL.has(e.type)) continue;
      if (e.type === "battery") {
        const ri = Math.max(P(c, "ri"), 1e-3);
        st.push({ a: A, b: B, g: 1 / ri, i: P(c, "u") / ri, el: e });
      } else if (e.type === "led") {
        if (!ledOn[e.key]) continue;
        const rs = Math.max(P(c, "rs"), 1e-3);
        st.push({ a: A, b: B, g: 1 / rs, i: P(c, "vf") / rs, el: e });
      } else if (e.type === "fuse") {
        if (fuseOpen[e.key]) continue;
        st.push({ a: A, b: B, g: 1 / Math.max(P(c, "r"), 1e-4), i: 0, el: e });
      } else {
        st.push({ a: A, b: B, g: 1 / Math.max(P(c, "r"), 1e-4), i: 0, el: e });
      }
    }
    return st;
  };

  /* Jeder galvanisch getrennte Teil der Schaltung wird für sich gelöst, jeweils mit
     eigenem Bezugsknoten. Ohne das bekämen getrennte Kreise – und Bauteile ohne
     geschlossenen Weg – keine definierte Knotenspannung und läsen sich wie kurzgeschlossen. */
  const solveOnce = () => {
    const st = stamps();
    const nb = new Map<string, string[]>();
    const touch = (x: string) => {
      if (!nb.has(x)) nb.set(x, []);
    };
    for (const s of st) {
      touch(s.a);
      touch(s.b);
      if (s.a !== s.b) {
        nb.get(s.a).push(s.b);
        nb.get(s.b).push(s.a);
      }
    }
    const V = new Map<string, number>();
    for (const comp of components(nb.keys(), (x) => nb.get(x))) {
      const inComp = new Set(comp);
      const gnd = comp[0];
      V.set(gnd, 0);
      const idx = new Map<string, number>();
      let n = 0;
      for (const nd of comp) if (nd !== gnd) idx.set(nd, n++);
      if (!n) continue;
      const A = Array.from({ length: n }, () => new Float64Array(n + 1));
      for (const s of st) {
        if (s.a === s.b || !inComp.has(s.a)) continue;
        const ia = idx.has(s.a) ? idx.get(s.a) : -1,
          ib = idx.has(s.b) ? idx.get(s.b) : -1;
        if (ia >= 0) {
          A[ia][ia] += s.g;
          A[ia][n] += s.i;
          if (ib >= 0) A[ia][ib] -= s.g;
        }
        if (ib >= 0) {
          A[ib][ib] += s.g;
          A[ib][n] -= s.i;
          if (ia >= 0) A[ib][ia] -= s.g;
        }
      }
      const x = solveInPlace(A, n);
      for (const [nd, i] of idx) V.set(nd, x[i]);
    }
    return { V, st };
  };
  const current = (sol: ReturnType<typeof solveOnce>, s: Stamp) =>
    s.g * ((sol.V.get(s.a) ?? 0) - (sol.V.get(s.b) ?? 0)) - s.i; // von a nach b durch das Bauteil

  /* LEDs sperren gegen die Durchlassrichtung, Sicherungen lösen aus:
     beides iterativ, bis der Zustand stabil ist */
  let sol = solveOnce();
  for (let it = 0; it < 12; it++) {
    let changed = false;
    for (const s of sol.st) {
      const e = s.el;
      const I = current(sol, s);
      if (e.type === "led" && I < 0) {
        ledOn[e.key] = false;
        changed = true;
      }
      if (e.type === "fuse" && Math.abs(I) > P(e.cell, "imax")) {
        fuseOpen[e.key] = true;
        changed = true;
      }
    }
    if (!changed) break;
    sol = solveOnce();
  }
  for (const e of els) {
    /* „sperrt“ soll nur dastehen, wenn die LED wirklich verpolt ist – dann liegt
       eine deutliche Gegenspannung an ihr. Eine LED, die bloß überbrückt oder
       stromlos ist, hat ~0 V über sich und zeigt schlicht 0 mA. */
    if (
      e.type === "led" &&
      !ledOn[e.key] &&
      (sol.V.get(find(e.a)) ?? 0) - (sol.V.get(find(e.b)) ?? 0) < -0.5
    )
      res.blocked.add(e.key);
    if (e.type === "fuse" && fuseOpen[e.key]) res.tripped.add(e.key);
  }

  /* --- Ströme und Spannungen je Bauteil --- */
  for (const s of sol.st) {
    const e = s.el;
    const U = (sol.V.get(s.a) ?? 0) - (sol.V.get(s.b) ?? 0);
    const I = current(sol, s);
    if (e.type === "battery") {
      res.cur[e.key] = -I; // abgegebener Strom
      res.volt[e.key] = U;
      if (e === batts[0]) {
        res.ibatt = -I;
        res.ubatt = U;
      }
    } else {
      res.cur[e.key] = I;
      res.volt[e.key] = U;
    }
  }
  res.closed = batts.some((e) => Math.abs(res.cur[e.key] || 0) > EPS);
  res.short = batts.some((e) => (res.cur[e.key] || 0) > P(e.cell, "imax"));

  /* --- Verbraucher: leuchtet, läuft, summt, überlastet --- */
  for (const e of els) {
    if (!CONSUMER.has(e.type)) continue;
    const I = Math.abs(res.cur[e.key] || 0),
      c = e.cell;
    if (e.type === "lamp") {
      const pn = Math.max(P(c, "un") * P(c, "in"), 1e-6);
      const b = (I * I * P(c, "r")) / pn;
      res.bright[e.key] = b;
      if (b > 0.04) res.lit.add(e.key);
      if (b > 1.4) res.overload.add(e.key);
    } else if (e.type === "led") {
      res.bright[e.key] = I / Math.max(P(c, "in"), 1e-6);
      if (I > 0.001) res.lit.add(e.key);
      if (I > P(c, "imax")) res.overload.add(e.key);
    } else if (I >= P(c, "imin")) res.lit.add(e.key);
  }

  /* --- Stromrichtung in den Leitungen ---
     Die Bauteilströme stehen fest, die Leitungen dazwischen sind aber zu einem
     Knoten verschmolzen und haben deshalb keine eigene Spannung. Also wird das
     Leitungsnetz noch einmal für sich gerechnet: jede Strecke bekommt denselben
     Leitwert, an den Bauteilanschlüssen werden die bekannten Ströme eingespeist.
     Das erfüllt die Knotenregel und gibt jeder Strecke eine eindeutige Richtung –
     auch in Parallelzweigen, wo die reine Erreichbarkeit von + und − beide
     Richtungen zulässt und die Animation deshalb falsch herum lief. */
  const segCur = (() => {
    const idOf = new Map<string, number>(),
      edges: [number, number, number][] = [];
    let n = 0;
    const nid = (k: string) => {
      if (!idOf.has(k)) idOf.set(k, n++);
      return idOf.get(k);
    };
    segs.forEach((s, i) => edges.push([nid(s.na), nid(s.nb), i]));
    for (const e of els)
      // geschlossene Schalter leiten mit
      if (e.type === "spdt" || ((e.type === "switch" || e.type === "button") && e.cell.closed))
        edges.push([nid(e.a), nid(e.b), -1]);
    const inj = new Float64Array(n);
    for (const s of sol.st) {
      const e = s.el;
      const I = current(sol, s);
      if (idOf.has(e.a)) inj[idOf.get(e.a)] -= I; // dort verlässt der Strom das Leitungsnetz
      if (idOf.has(e.b)) inj[idOf.get(e.b)] += I; // und dort kommt er zurück
    }
    const nbr: number[][] = Array.from({ length: n }, () => []);
    for (const [u, v] of edges)
      if (u !== v) {
        nbr[u].push(v);
        nbr[v].push(u);
      }
    const V = new Float64Array(n);
    for (const comp of components(
      Array.from({ length: n }, (_, i) => i),
      (i) => nbr[i],
    )) {
      const inComp = new Set(comp);
      const idx = new Map<number, number>();
      let m = 0;
      for (let j = 1; j < comp.length; j++) idx.set(comp[j], m++); // comp[0] ist Bezugsknoten
      if (!m) continue;
      const A = Array.from({ length: m }, () => new Float64Array(m + 1));
      for (const [u, v] of edges) {
        if (u === v || !inComp.has(u)) continue;
        const iu = idx.has(u) ? idx.get(u) : -1,
          iv = idx.has(v) ? idx.get(v) : -1;
        if (iu >= 0) {
          A[iu][iu] += 1;
          if (iv >= 0) A[iu][iv] -= 1;
        }
        if (iv >= 0) {
          A[iv][iv] += 1;
          if (iu >= 0) A[iv][iu] -= 1;
        }
      }
      for (const [nd, i] of idx) A[i][m] = inj[nd];
      const x = solveInPlace(A, m);
      for (const [nd, i] of idx) V[nd] = x[i];
    }
    const out = new Float64Array(segs.length); // Leitwert 1: Strom = Spannungsdifferenz
    for (const [u, v, si] of edges) if (si >= 0) out[si] = V[u] - V[v];
    return out;
  })();

  /* --- topologische Sicht für Glühen und Flussanimation --- */
  interface TEdge {
    a: string;
    b: string;
    seg?: number;
    el?: El;
  }
  const te: TEdge[] = segs.map((s, i) => ({ a: s.na, b: s.nb, seg: i }));
  for (const e of els) {
    let cond = true;
    if (e.type === "switch" || e.type === "button") cond = !!e.cell.closed;
    else if (e.type === "voltmeter")
      cond = false; // ein Voltmeter schließt keinen Kreis
    else if (e.type === "fuse") cond = !fuseOpen[e.key];
    else if (e.type === "led") cond = !!ledOn[e.key];
    if (!cond) continue;
    te.push({ a: e.a, b: e.b, el: e });
  }
  const battEdge = new Map<PartId, number>();
  te.forEach((e, i) => {
    if (e.el && e.el.type === "battery") battEdge.set(e.el.key, i);
  });
  const adj: Record<string, [string, number][]> = {};
  te.forEach((e, i) => {
    (adj[e.a] ??= []).push([e.b, i]);
    (adj[e.b] ??= []).push([e.a, i]);
  });
  const reach = (start: string, ex: Set<number>) => {
    const seen = new Set([start]),
      st = [start];
    while (st.length) {
      const n = st.pop();
      for (const [m, ei] of adj[n] || []) {
        if (ex.has(ei)) continue;
        if (!seen.has(m)) {
          seen.add(m);
          st.push(m);
        }
      }
    }
    return seen;
  };
  /* Eine Verbindung leuchtet, wenn sie bei irgendeiner aktiven Quelle auf einem
     Weg von deren + zu deren − liegt. Die Quelle selbst darf den Weg nicht schließen. */
  const active = batts.filter((b) => Math.abs(res.cur[b.key] || 0) > EPS);
  /* 0 = kein Strom, sonst die technische Stromrichtung: +1 von a nach b, −1 von b nach a.
     Welches Ende vom Pluspol und welches vom Minuspol aus erreichbar ist, gibt sie vor. */
  const flowDir = (i: number) => {
    for (const b of active) {
      const bi = battEdge.get(b.key);
      if (bi === i) continue;
      const ex = new Set([i, bi]);
      const Pp = reach(b.a, ex),
        Mm = reach(b.b, ex),
        e = te[i];
      if (Pp.has(e.a) && Mm.has(e.b)) return 1;
      if (Pp.has(e.b) && Mm.has(e.a)) return -1;
    }
    return 0;
  };
  const liveNode = new Set<string>();
  te.forEach((e, i) => {
    const d = flowDir(i);
    if (e.seg !== undefined) {
      const s = segs[e.seg],
        ic = segCur[e.seg]; /* allein der gerechnete Strom gibt die Richtung */
      res.wires[s.key] = { live: d !== 0, dir: Math.abs(ic) > 1e-9 ? (ic > 0 ? 1 : -1) : 0 };
      if (d) {
        liveNode.add(e.a);
        liveNode.add(e.b);
      }
    } else if (d) res.glow.add(e.el.key);
  });
  for (const b of active) res.glow.add(b.key);
  for (const [p, st] of Object.entries(res.points)) st.live = liveNode.has(wireNode(p));
  for (const [id, c] of Object.entries(circuit.parts))
    if (c.type === "cross")
      res.crossLive[id] = {
        h: liveNode.has(portNode(c, "E", id)),
        v: liveNode.has(portNode(c, "N", id)),
      };
  return res;
}

/* Ruhebild: dieselbe Schaltung ohne Spannungsquelle gerechnet. Knotenpunkte und lose Enden
   stehen da, aber nichts leuchtet und kein Messgerät zeigt etwas – für Skizzen, die keine
   Werte der Musterlösung verraten sollen (Ghost-Schaltung). */
export function idleSim(circuit: Circuit): SimResult {
  const parts = Object.fromEntries(
    Object.entries(circuit.parts).filter(([, p]) => p.type !== "battery"),
  );
  return simulate({ ...circuit, parts });
}
