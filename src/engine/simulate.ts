import { CONSUMER, EPS, P, TWO, IDEAL, hasPort, nodeId, sidesOf, spdtOuts } from "./parts";
import type { Grid, Side, SimResult } from "../domain/types";

/* ================= Simulation =================
   Zwei Sichten auf dieselbe Schaltung:
   – ein Gleichstrom-Löser (Knotenpotentialverfahren) für echte Ströme und Spannungen
   – der topologische Erreichbarkeitstest von + nach − dafür, was überhaupt Strom führt
   – die Flussrichtung der Animation folgt den gerechneten Strömen, also immer + nach −   */
export function simulate(grid: Grid): SimResult {
  const keys = Object.keys(grid);
  const res: SimResult = {
    hasBattery: false,
    closed: false,
    short: false,
    ibatt: 0,
    ubatt: 0,
    lines: [],
    glow: new Set<string>(),
    liveNode: new Set<string>(),
    deg: {},
    lit: new Set<string>(),
    bright: {},
    cur: {},
    volt: {},
    tripped: new Set<string>(),
    overload: new Set<string>(),
    blocked: new Set<string>(),
  };

  /* --- Segmente zwischen benachbarten Anschlüssen --- */
  const segs: any[] = [];
  for (const k of keys) {
    const [x, y] = k.split(",").map(Number);
    const c = grid[k];
    const rk = `${x + 1},${y}`,
      dk = `${x},${y + 1}`;
    const rc = grid[rk],
      dc = grid[dk];
    if (rc && hasPort(c, "E") && hasPort(rc, "W"))
      segs.push({
        a: [x, y],
        b: [x + 1, y],
        na: nodeId(c, "E", k),
        nb: nodeId(rc, "W", rk),
        ka: k,
        kb: rk,
      });
    if (dc && hasPort(c, "S") && hasPort(dc, "N"))
      segs.push({
        a: [x, y],
        b: [x, y + 1],
        na: nodeId(c, "S", k),
        nb: nodeId(dc, "N", dk),
        ka: k,
        kb: dk,
      });
  }
  for (const s of segs)
    for (const kk of [s.ka, s.kb])
      if (grid[kk].type === "wire") res.deg[kk] = (res.deg[kk] || 0) + 1;

  /* --- Bauteile als Zweipole --- */
  const els: any[] = [];
  for (const k of keys) {
    const c = grid[k];
    if (c.type === "battery") {
      let plus = c.orient === "h" ? "E" : "N",
        minus = c.orient === "h" ? "W" : "S";
      if (c.rev) {
        const t = plus;
        plus = minus;
        minus = t;
      }
      els.push({
        key: k,
        type: "battery",
        cell: c,
        a: nodeId(c, plus as Side, k),
        b: nodeId(c, minus as Side, k),
      });
    } else if (c.type === "spdt") {
      const outs = spdtOuts(c);
      els.push({
        key: k,
        type: "spdt",
        cell: c,
        a: nodeId(c, c.dir, k),
        b: nodeId(c, outs[c.pos ? 1 : 0], k),
      });
    } else if (TWO.has(c.type)) {
      const [s1, s2] = sidesOf(c);
      let a = nodeId(c, s1, k),
        b = nodeId(c, s2, k);
      if (c.rev) {
        const t = a;
        a = b;
        b = t;
      } // LED-Polung
      els.push({ key: k, type: c.type, cell: c, a, b });
    }
  }
  const batts = els.filter((e) => e.type === "battery");
  res.hasBattery = batts.length > 0;

  /* --- Knoten verschmelzen: Segmente und geschlossene ideale Schalter --- */
  const par = new Map();
  const find = (a) => {
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
  const uni = (a, b) => {
    const ra = find(a),
      rb = find(b);
    if (ra !== rb) par.set(ra, rb);
  };
  for (const s of segs) uni(s.na, s.nb);
  for (const e of els) {
    if (e.type === "spdt") uni(e.a, e.b);
    else if ((e.type === "switch" || e.type === "button") && e.cell.closed) uni(e.a, e.b);
  }

  if (!batts.length) {
    res.lines = segs.map((s) => ({ a: s.a, b: s.b, live: false, dir: 0 as const }));
    return res;
  }

  /* --- Stempel: Leitwert g zwischen a und b, Stromquelle i (Norton) --- */
  /* Eine ausgelöste Sicherung bleibt offen, bis sie von Hand eingeschaltet wird
     (cell.open). Sie ist damit der einzige Bauteilzustand, den die Simulation
     zurück ins Feld schreibt – siehe useEffect in App. */
  const fuseOpen = {},
    ledOn = {};
  for (const e of els) {
    if (e.type === "led") ledOn[e.key] = true;
    if (e.type === "fuse" && e.cell.open) fuseOpen[e.key] = true;
  }

  const stamps = () => {
    const st = [];
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
    const nb = new Map();
    const touch = (x) => {
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
    const compOf = new Map(),
      comps = [];
    for (const start of nb.keys()) {
      if (compOf.has(start)) continue;
      const ci = comps.length,
        comp = [start];
      compOf.set(start, ci);
      for (let q = 0; q < comp.length; q++)
        for (const m of nb.get(comp[q]))
          if (!compOf.has(m)) {
            compOf.set(m, ci);
            comp.push(m);
          }
      comps.push(comp);
    }
    const V = new Map();
    comps.forEach((comp, ci) => {
      const gnd = comp[0];
      V.set(gnd, 0);
      const idx = new Map();
      let n = 0;
      for (const nd of comp) if (nd !== gnd) idx.set(nd, n++);
      if (!n) return;
      const A = Array.from({ length: n }, () => new Float64Array(n + 1));
      for (const s of st) {
        if (s.a === s.b || compOf.get(s.a) !== ci) continue;
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
      for (let col = 0; col < n; col++) {
        /* Gauß-Jordan mit Spaltenpivot */
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
      for (const [nd, i] of idx) V.set(nd, Math.abs(A[i][i]) < 1e-14 ? 0 : A[i][n] / A[i][i]);
    });
    return { V, st };
  };

  /* LEDs sperren gegen die Durchlassrichtung, Sicherungen lösen aus:
     beides iterativ, bis der Zustand stabil ist */
  let sol = solveOnce();
  for (let it = 0; it < 12; it++) {
    let changed = false;
    for (const s of sol.st) {
      const e = s.el;
      const I = s.g * ((sol.V.get(s.a) ?? 0) - (sol.V.get(s.b) ?? 0)) - s.i;
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
    const Ua = sol.V.get(s.a) ?? 0,
      Ub = sol.V.get(s.b) ?? 0;
    const I = s.g * (Ua - Ub) - s.i; // von a nach b durch das Bauteil
    if (e.type === "battery") {
      res.cur[e.key] = -I; // abgegebener Strom
      res.volt[e.key] = Ua - Ub;
      if (e === batts[0]) {
        res.ibatt = -I;
        res.ubatt = Ua - Ub;
      }
    } else {
      res.cur[e.key] = I;
      res.volt[e.key] = Ua - Ub;
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
    const idOf = new Map(),
      edges = [];
    let n = 0;
    const nid = (k) => {
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
      const I = s.g * ((sol.V.get(s.a) ?? 0) - (sol.V.get(s.b) ?? 0)) - s.i; // von a nach b im Bauteil
      if (idOf.has(e.a)) inj[idOf.get(e.a)] -= I; // dort verlässt der Strom das Leitungsnetz
      if (idOf.has(e.b)) inj[idOf.get(e.b)] += I; // und dort kommt er zurück
    }
    const nbr = Array.from({ length: n }, () => []);
    for (const [u, v] of edges)
      if (u !== v) {
        nbr[u].push(v);
        nbr[v].push(u);
      }
    const compOf = new Int32Array(n).fill(-1),
      comps = [];
    for (let s0 = 0; s0 < n; s0++) {
      if (compOf[s0] >= 0) continue;
      const ci = comps.length,
        comp = [s0];
      compOf[s0] = ci;
      for (let q = 0; q < comp.length; q++)
        for (const m of nbr[comp[q]])
          if (compOf[m] < 0) {
            compOf[m] = ci;
            comp.push(m);
          }
      comps.push(comp);
    }
    const V = new Float64Array(n);
    comps.forEach((comp, ci) => {
      const idx = new Map();
      let m = 0;
      for (let j = 1; j < comp.length; j++) idx.set(comp[j], m++); // comp[0] ist Bezugsknoten
      if (!m) return;
      const A = Array.from({ length: m }, () => new Float64Array(m + 1));
      for (const [u, v] of edges) {
        if (u === v || compOf[u] !== ci) continue;
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
      for (let col = 0; col < m; col++) {
        /* Gauß-Jordan mit Spaltenpivot */
        let piv = col;
        for (let r = col + 1; r < m; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
        if (Math.abs(A[piv][col]) < 1e-14) continue;
        if (piv !== col) {
          const t = A[piv];
          A[piv] = A[col];
          A[col] = t;
        }
        for (let r = 0; r < m; r++) {
          if (r === col) continue;
          const f = A[r][col] / A[col][col];
          if (!f) continue;
          for (let cc = col; cc <= m; cc++) A[r][cc] -= f * A[col][cc];
        }
      }
      for (const [nd, i] of idx) V[nd] = Math.abs(A[i][i]) < 1e-14 ? 0 : A[i][m] / A[i][i];
    });
    const out = new Float64Array(segs.length); // Leitwert 1: Strom = Spannungsdifferenz
    for (const [u, v, si] of edges) if (si >= 0) out[si] = V[u] - V[v];
    return out;
  })();

  /* --- topologische Sicht für Glühen und Flussanimation --- */
  const te: any[] = segs.map((s, i) => ({ a: s.na, b: s.nb, seg: i }));
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
  const battEdge = new Map();
  te.forEach((e, i) => {
    if (e.el && e.el.type === "battery") battEdge.set(e.el.key, i);
  });
  const adj = {};
  te.forEach((e, i) => {
    (adj[e.a] = adj[e.a] || []).push([e.b, i]);
    (adj[e.b] = adj[e.b] || []).push([e.a, i]);
  });
  const reach = (start, ex) => {
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
  const flowDir = (i) => {
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
  res.lines = segs.map((s) => ({ a: s.a, b: s.b, live: false, dir: 0 }));
  te.forEach((e, i) => {
    const d = flowDir(i);
    if (e.seg !== undefined) {
      const ic = segCur[e.seg]; /* allein der gerechnete Strom gibt die Richtung */
      res.lines[e.seg].live = d !== 0;
      res.lines[e.seg].dir = Math.abs(ic) > 1e-9 ? (ic > 0 ? 1 : -1) : 0;
      if (d) {
        res.liveNode.add(e.a);
        res.liveNode.add(e.b);
        res.glow.add(segs[e.seg].ka);
        res.glow.add(segs[e.seg].kb);
      }
    } else if (d) res.glow.add(e.el.key);
  });
  for (const b of active) res.glow.add(b.key);
  return res;
}
