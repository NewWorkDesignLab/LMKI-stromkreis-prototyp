import { useState, useEffect, useRef, useMemo } from "react";
import {
  Cable, ToggleRight, Lightbulb, Battery, Eraser, MousePointer2, RotateCw, RotateCcw,
  Trash2, ArrowLeft, ArrowRight, Zap, CheckCircle2, Circle, AlertTriangle,
  LayoutGrid, BookOpen, X, Gauge, Activity, CircleDot, GitFork, Fan, Bell, Shield,
} from "lucide-react";

/* ================= constants ================= */
const CELL = 60;
const BG = "#f3f0e9", DOT = "#dcd6c8", WIRE = "#3a3a3a", LIVE = "#f4a522",
  FLOW = "#fff4d6", BATT_PLUS = "#e25555", SWITCH_ON = "#2f9e8f", SWITCH_OFF = "#b9b3a4",
  LAMP_ON = "#ffc23c", LAMP_STROKE = "#9a9484", WALL = "#d8d2c4", FORBID = "#e25555",
  INK = "#2b2b2b", MUTE = "#b9b3a4", HOT = "#d63b3b";
const center = (i) => i * CELL + CELL / 2;
const EPS = 1e-5;

/* Bauteil-Vorgaben. r = Widerstand, un/in = Nennwerte, ri = Innenwiderstand */
const DEF = {
  battery: { u: 9, ri: 0.5, imax: 1.0 },
  lamp: { r: 90, un: 9, in: 0.1 },
  resistor: { r: 220 },
  led: { vf: 2, rs: 25, in: 0.015, imax: 0.03 },
  motor: { r: 60, imin: 0.04 },
  buzzer: { r: 120, imin: 0.03 },
  fuse: { r: 0.02, imax: 0.5 },
  ammeter: { r: 0.005 },
  voltmeter: { r: 1e6 },
};
const P = (c, k) => (c && c[k] !== undefined ? c[k] : (DEF[c.type] || {})[k]);

const TWO = new Set(["battery", "lamp", "resistor", "led", "motor", "buzzer",
  "fuse", "ammeter", "voltmeter", "switch", "button"]);
const CONSUMER = new Set(["lamp", "led", "motor", "buzzer"]);
const IDEAL = new Set(["switch", "button", "spdt"]);   // widerstandslos, per Union verschmolzen

const sidesOf = (c) => (c.orient === "h" ? ["W", "E"] : ["N", "S"]);
const spdtOuts = (c) => (c.dir === "N" || c.dir === "S" ? ["W", "E"] : ["N", "S"]);

function hasPort(c, side) {
  if (!c) return false;
  if (c.type === "wire" || c.type === "cross") return true;
  if (c.type === "spdt") return side === c.dir || spdtOuts(c).includes(side);
  if (TWO.has(c.type)) return sidesOf(c).includes(side);
  return false;
}
/* Knotenname eines Anschlusses. Leitungszellen fassen alle 4 Seiten zusammen,
   eine Kreuzung hält waagerecht und senkrecht getrennt. */
function nodeId(c, side, key) {
  if (c.type === "wire") return `w:${key}`;
  if (c.type === "cross") return side === "N" || side === "S" ? `cv:${key}` : `ch:${key}`;
  if (c.type === "spdt") return side === c.dir ? `k:${key}:c` : `k:${key}:${side}`;
  return `t:${key}:${side}`;
}

/* ================= Simulation =================
   Zwei Sichten auf dieselbe Schaltung:
   – ein Gleichstrom-Löser (Knotenpotentialverfahren) für echte Ströme und Spannungen
   – der topologische Erreichbarkeitstest von + nach − für Glühen und Flussanimation   */
function simulate(grid) {
  const keys = Object.keys(grid);
  const res = {
    hasBattery: false, closed: false, short: false, ibatt: 0, ubatt: 0,
    lines: [], glow: new Set(), liveNode: new Set(), deg: {},
    lit: new Set(), bright: {}, cur: {}, volt: {},
    tripped: new Set(), overload: new Set(), blocked: new Set(),
  };

  /* --- Segmente zwischen benachbarten Anschlüssen --- */
  const segs = [];
  for (const k of keys) {
    const [x, y] = k.split(",").map(Number);
    const c = grid[k];
    const rk = `${x + 1},${y}`, dk = `${x},${y + 1}`;
    const rc = grid[rk], dc = grid[dk];
    if (rc && hasPort(c, "E") && hasPort(rc, "W"))
      segs.push({ a: [x, y], b: [x + 1, y], na: nodeId(c, "E", k), nb: nodeId(rc, "W", rk), ka: k, kb: rk });
    if (dc && hasPort(c, "S") && hasPort(dc, "N"))
      segs.push({ a: [x, y], b: [x, y + 1], na: nodeId(c, "S", k), nb: nodeId(dc, "N", dk), ka: k, kb: dk });
  }
  for (const s of segs) for (const kk of [s.ka, s.kb])
    if (grid[kk].type === "wire") res.deg[kk] = (res.deg[kk] || 0) + 1;

  /* --- Bauteile als Zweipole --- */
  const els = [];
  for (const k of keys) {
    const c = grid[k];
    if (c.type === "battery") {
      let plus = c.orient === "h" ? "E" : "N", minus = c.orient === "h" ? "W" : "S";
      if (c.rev) { const t = plus; plus = minus; minus = t; }
      els.push({ key: k, type: "battery", cell: c, a: nodeId(c, plus, k), b: nodeId(c, minus, k) });
    } else if (c.type === "spdt") {
      const outs = spdtOuts(c);
      els.push({ key: k, type: "spdt", cell: c, a: nodeId(c, c.dir, k), b: nodeId(c, outs[c.pos ? 1 : 0], k) });
    } else if (TWO.has(c.type)) {
      const [s1, s2] = sidesOf(c);
      let a = nodeId(c, s1, k), b = nodeId(c, s2, k);
      if (c.rev) { const t = a; a = b; b = t; }   // LED-Polung
      els.push({ key: k, type: c.type, cell: c, a, b });
    }
  }
  const batts = els.filter((e) => e.type === "battery");
  res.hasBattery = batts.length > 0;

  /* --- Knoten verschmelzen: Segmente und geschlossene ideale Schalter --- */
  const par = new Map();
  const find = (a) => {
    if (!par.has(a)) par.set(a, a);
    let r = a; while (par.get(r) !== r) r = par.get(r);
    while (par.get(a) !== r) { const n = par.get(a); par.set(a, r); a = n; }
    return r;
  };
  const uni = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) par.set(ra, rb); };
  for (const s of segs) uni(s.na, s.nb);
  for (const e of els) {
    if (e.type === "spdt") uni(e.a, e.b);
    else if ((e.type === "switch" || e.type === "button") && e.cell.closed) uni(e.a, e.b);
  }

  if (!batts.length) {
    res.lines = segs.map((s) => ({ a: s.a, b: s.b, live: false }));
    return res;
  }

  /* --- Stempel: Leitwert g zwischen a und b, Stromquelle i (Norton) --- */
  const fuseOpen = {}, ledOn = {};
  for (const e of els) if (e.type === "led") ledOn[e.key] = true;

  const stamps = () => {
    const st = [];
    for (const e of els) {
      const c = e.cell, A = find(e.a), B = find(e.b);
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
    const touch = (x) => { if (!nb.has(x)) nb.set(x, []); };
    for (const s of st) {
      touch(s.a); touch(s.b);
      if (s.a !== s.b) { nb.get(s.a).push(s.b); nb.get(s.b).push(s.a); }
    }
    const compOf = new Map(), comps = [];
    for (const start of nb.keys()) {
      if (compOf.has(start)) continue;
      const ci = comps.length, comp = [start];
      compOf.set(start, ci);
      for (let q = 0; q < comp.length; q++)
        for (const m of nb.get(comp[q])) if (!compOf.has(m)) { compOf.set(m, ci); comp.push(m); }
      comps.push(comp);
    }
    const V = new Map();
    comps.forEach((comp, ci) => {
      const gnd = comp[0];
      V.set(gnd, 0);
      const idx = new Map(); let n = 0;
      for (const nd of comp) if (nd !== gnd) idx.set(nd, n++);
      if (!n) return;
      const A = Array.from({ length: n }, () => new Float64Array(n + 1));
      for (const s of st) {
        if (s.a === s.b || compOf.get(s.a) !== ci) continue;
        const ia = idx.has(s.a) ? idx.get(s.a) : -1, ib = idx.has(s.b) ? idx.get(s.b) : -1;
        if (ia >= 0) { A[ia][ia] += s.g; A[ia][n] += s.i; if (ib >= 0) A[ia][ib] -= s.g; }
        if (ib >= 0) { A[ib][ib] += s.g; A[ib][n] -= s.i; if (ia >= 0) A[ib][ia] -= s.g; }
      }
      for (let col = 0; col < n; col++) {        /* Gauß-Jordan mit Spaltenpivot */
        let piv = col;
        for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
        if (Math.abs(A[piv][col]) < 1e-14) continue;
        if (piv !== col) { const t = A[piv]; A[piv] = A[col]; A[col] = t; }
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
      if (e.type === "led" && I < 0) { ledOn[e.key] = false; changed = true; }
      if (e.type === "fuse" && Math.abs(I) > P(e.cell, "imax")) { fuseOpen[e.key] = true; changed = true; }
    }
    if (!changed) break;
    sol = solveOnce();
  }
  for (const e of els) {
    if (e.type === "led" && !ledOn[e.key]) res.blocked.add(e.key);
    if (e.type === "fuse" && fuseOpen[e.key]) res.tripped.add(e.key);
  }

  /* --- Ströme und Spannungen je Bauteil --- */
  for (const s of sol.st) {
    const e = s.el;
    const Ua = sol.V.get(s.a) ?? 0, Ub = sol.V.get(s.b) ?? 0;
    const I = s.g * (Ua - Ub) - s.i;              // von a nach b durch das Bauteil
    if (e.type === "battery") {
      res.cur[e.key] = -I;                        // abgegebener Strom
      res.volt[e.key] = Ua - Ub;
      if (e === batts[0]) { res.ibatt = -I; res.ubatt = Ua - Ub; }
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
    const I = Math.abs(res.cur[e.key] || 0), c = e.cell;
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

  /* --- topologische Sicht für Glühen und Flussanimation --- */
  const te = segs.map((s, i) => ({ a: s.na, b: s.nb, seg: i }));
  for (const e of els) {
    let cond = true;
    if (e.type === "switch" || e.type === "button") cond = !!e.cell.closed;
    else if (e.type === "voltmeter") cond = false;  // ein Voltmeter schließt keinen Kreis
    else if (e.type === "fuse") cond = !fuseOpen[e.key];
    else if (e.type === "led") cond = !!ledOn[e.key];
    if (!cond) continue;
    te.push({ a: e.a, b: e.b, el: e });
  }
  const battEdge = new Map();
  te.forEach((e, i) => { if (e.el && e.el.type === "battery") battEdge.set(e.el.key, i); });
  const adj = {};
  te.forEach((e, i) => {
    (adj[e.a] = adj[e.a] || []).push([e.b, i]);
    (adj[e.b] = adj[e.b] || []).push([e.a, i]);
  });
  const reach = (start, ex) => {
    const seen = new Set([start]), st = [start];
    while (st.length) {
      const n = st.pop();
      for (const [m, ei] of adj[n] || []) { if (ex.has(ei)) continue; if (!seen.has(m)) { seen.add(m); st.push(m); } }
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
      const Pp = reach(b.a, ex), Mm = reach(b.b, ex), e = te[i];
      if (Pp.has(e.a) && Mm.has(e.b)) return 1;
      if (Pp.has(e.b) && Mm.has(e.a)) return -1;
    }
    return 0;
  };
  res.lines = segs.map((s) => ({ a: s.a, b: s.b, live: false, dir: 0 }));
  te.forEach((e, i) => {
    const d = flowDir(i);
    if (e.seg !== undefined) {
      res.lines[e.seg].live = d !== 0;
      res.lines[e.seg].dir = d;
      if (d) {
        res.liveNode.add(e.a); res.liveNode.add(e.b);
        res.glow.add(segs[e.seg].ka); res.glow.add(segs[e.seg].kb);
      }
    } else if (d) res.glow.add(e.el.key);
  });
  for (const b of active) res.glow.add(b.key);
  return res;
}

/* ================= Zahlen ================= */
const de = (s) => String(s).replace(".", ",");
const fmtA = (i) => {
  const a = Math.abs(i);
  return a >= 1 ? `${de(a.toFixed(2))} A` : `${a < 0.0005 ? "0" : de((a * 1000).toFixed(a >= 0.01 ? 0 : 1))} mA`;
};
const fmtV = (v) => `${de(Math.abs(v).toFixed(2))} V`;
const fmtR = (r) => (r >= 1000 ? `${de((r / 1000).toFixed(r % 1000 ? 1 : 0))} kΩ` : `${r} Ω`);

/* ================= Symbole ================= */
const box = (cx, cy) => <rect x={cx - 17} y={cy - 17} width={34} height={34} rx={8} fill="#fff" stroke={INK} strokeWidth={2} />;

function batteryEl(x, y, c, active, hot) {
  const cx = center(x), cy = center(y), v = c.orient === "v";
  const rev = !!c.rev;
  const pl = <text fontSize={15} fontWeight="700" fill={BATT_PLUS}>+</text>;
  return (
    <g key={`b${x},${y}`}>
      {active && <circle cx={cx} cy={cy} r={24} fill="none" stroke={hot ? HOT : LIVE} strokeWidth={3} opacity={0.6} />}
      {box(cx, cy)}
      {v ? (<>
        <line x1={cx - 12} y1={cy} x2={cx + 12} y2={cy} stroke="#d9d3c4" strokeWidth={1.5} />
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize={15} fontWeight="700" fill={rev ? INK : BATT_PLUS}>{rev ? "−" : "+"}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={15} fontWeight="700" fill={rev ? BATT_PLUS : INK}>{rev ? "+" : "−"}</text>
      </>) : (<>
        <line x1={cx} y1={cy - 12} x2={cx} y2={cy + 12} stroke="#d9d3c4" strokeWidth={1.5} />
        <text x={cx + 9} y={cy + 5} textAnchor="middle" fontSize={15} fontWeight="700" fill={rev ? INK : BATT_PLUS}>{rev ? "−" : "+"}</text>
        <text x={cx - 9} y={cy + 5} textAnchor="middle" fontSize={15} fontWeight="700" fill={rev ? BATT_PLUS : INK}>{rev ? "+" : "−"}</text>
      </>)}
    </g>
  );
}

function switchEl(x, y, c, glow) {
  const cx = center(x), cy = center(y), v = c.orient === "v", on = !!c.closed;
  const t1 = v ? [cx, cy + 15] : [cx - 15, cy];
  const t2 = v ? [cx, cy - 15] : [cx + 15, cy];
  const open = v ? [cx + 11, cy - 5] : [cx + 5, cy - 11];
  const col = on ? (glow ? LIVE : SWITCH_ON) : SWITCH_OFF;
  return (
    <g key={`s${x},${y}`}>
      {box(cx, cy)}
      <circle cx={t1[0]} cy={t1[1]} r={3} fill={INK} />
      <circle cx={t2[0]} cy={t2[1]} r={3} fill={INK} />
      <line x1={t1[0]} y1={t1[1]} x2={on ? t2[0] : open[0]} y2={on ? t2[1] : open[1]}
        stroke={col} strokeWidth={5} strokeLinecap="round" />
    </g>
  );
}

/* Taster: Schließer, leitet nur solange gedrückt */
function buttonEl(x, y, c, glow) {
  const cx = center(x), cy = center(y), v = c.orient === "v", on = !!c.closed;
  const col = on ? (glow ? LIVE : SWITCH_ON) : SWITCH_OFF;
  const t1 = v ? [cx, cy + 15] : [cx - 15, cy];
  const t2 = v ? [cx, cy - 15] : [cx + 15, cy];
  const off = on ? 0 : 7;
  return (
    <g key={`bt${x},${y}`}>
      {box(cx, cy)}
      <circle cx={t1[0]} cy={t1[1]} r={3} fill={INK} />
      <circle cx={t2[0]} cy={t2[1]} r={3} fill={INK} />
      <line x1={t1[0]} y1={t1[1]} x2={t2[0]} y2={t2[1]} stroke={SWITCH_OFF} strokeWidth={2} opacity={0.4} />
      {v ? (<>
        <line x1={cx - 9} y1={cy - off} x2={cx + 9} y2={cy - off} stroke={col} strokeWidth={4} strokeLinecap="round" />
        <line x1={cx} y1={cy - off} x2={cx} y2={cy - off - 8} stroke={col} strokeWidth={3} strokeLinecap="round" />
      </>) : (<>
        <line x1={cx + off} y1={cy - 9} x2={cx + off} y2={cy + 9} stroke={col} strokeWidth={4} strokeLinecap="round" />
        <line x1={cx + off} y1={cy} x2={cx + off + 8} y2={cy} stroke={col} strokeWidth={3} strokeLinecap="round" />
      </>)}
    </g>
  );
}

/* Wechselschalter: ein Anschluss (Wurzel), zwei Ausgänge */
function spdtEl(x, y, c, glow) {
  const cx = center(x), cy = center(y);
  const V = { N: [cx, cy - 15], S: [cx, cy + 15], W: [cx - 15, cy], E: [cx + 15, cy] };
  const outs = spdtOuts(c), act = outs[c.pos ? 1 : 0];
  const col = glow ? LIVE : SWITCH_ON;
  return (
    <g key={`k${x},${y}`}>
      {box(cx, cy)}
      {[c.dir, outs[0], outs[1]].map((s) => <circle key={s} cx={V[s][0]} cy={V[s][1]} r={3} fill={INK} />)}
      {outs.map((s) => (
        <line key={s} x1={V[c.dir][0]} y1={V[c.dir][1]} x2={V[s][0] * 0.82 + cx * 0.18} y2={V[s][1] * 0.82 + cy * 0.18}
          stroke={s === act ? col : SWITCH_OFF} strokeWidth={s === act ? 5 : 2}
          opacity={s === act ? 1 : 0.45} strokeLinecap="round" />
      ))}
    </g>
  );
}

function lampEl(x, y, c, on, bright, over) {
  const cx = center(x), cy = center(y), forbid = c.goal === "off";
  const b = Math.max(0, Math.min(1, bright || 0));
  const fill = on ? LAMP_ON : "#fff";
  return (
    <g key={`l${x},${y}`}>
      {on && <circle cx={cx} cy={cy} r={20 + 6 * b} fill={over ? HOT : LAMP_ON} className="lamp-on-glow" />}
      <circle cx={cx} cy={cy} r={15} fill={fill} fillOpacity={on ? 0.35 + 0.65 * b : 1}
        stroke={over ? HOT : forbid ? FORBID : LAMP_STROKE} strokeWidth={forbid || over ? 2.5 : 2}
        strokeDasharray={forbid ? "4 3" : "none"} />
      <path d={`M ${cx - 5} ${cy + 4} Q ${cx} ${cy - 8} ${cx + 5} ${cy + 4}`} fill="none"
        stroke={on ? "#a9710a" : "#b9b3a4"} strokeWidth={2} strokeLinecap="round" />
      {on && [0, 1, 2, 3, 4, 5].map((i) => {
        const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        return <line key={i} x1={cx + Math.cos(a) * 18} y1={cy + Math.sin(a) * 18}
          x2={cx + Math.cos(a) * (20 + 4 * b)} y2={cy + Math.sin(a) * (20 + 4 * b)}
          stroke={over ? HOT : LAMP_ON} strokeWidth={2.5} strokeLinecap="round" opacity={0.75} />;
      })}
    </g>
  );
}

/* LED: Dreieck zeigt in Durchlassrichtung, Balken ist die Kathode */
function ledEl(x, y, c, on, over) {
  const cx = center(x), cy = center(y), v = c.orient === "v";
  const rot = v ? (c.rev ? 180 : 0) : (c.rev ? 90 : 270);
  const col = over ? HOT : on ? LAMP_ON : "#fff";
  return (
    <g key={`d${x},${y}`}>
      {on && <circle cx={cx} cy={cy} r={20} fill={over ? HOT : LAMP_ON} className="lamp-on-glow" />}
      <g transform={`rotate(${rot} ${cx} ${cy})`}>
        <path d={`M ${cx - 9} ${cy - 8} L ${cx + 9} ${cy - 8} L ${cx} ${cy + 6} Z`}
          fill={col} stroke={over ? HOT : INK} strokeWidth={2} strokeLinejoin="round" />
        <line x1={cx - 10} y1={cy + 8} x2={cx + 10} y2={cy + 8} stroke={over ? HOT : INK} strokeWidth={2.5} strokeLinecap="round" />
        {on && <>
          <line x1={cx + 9} y1={cy - 12} x2={cx + 15} y2={cy - 18} stroke={LAMP_ON} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={cx + 13} y1={cy - 7} x2={cx + 19} y2={cy - 13} stroke={LAMP_ON} strokeWidth={2.5} strokeLinecap="round" />
        </>}
      </g>
    </g>
  );
}

function resistorEl(x, y, c, glow) {
  const cx = center(x), cy = center(y), v = c.orient === "v";
  return (
    <g key={`r${x},${y}`}>
      {box(cx, cy)}
      <rect x={v ? cx - 8 : cx - 12} y={v ? cy - 12 : cy - 8}
        width={v ? 16 : 24} height={v ? 24 : 16} rx={2}
        fill="#fff" stroke={glow ? LIVE : INK} strokeWidth={2.5} />
    </g>
  );
}

function fuseEl(x, y, c, glow, tripped) {
  const cx = center(x), cy = center(y), v = c.orient === "v";
  const col = tripped ? HOT : glow ? LIVE : INK;
  return (
    <g key={`f${x},${y}`}>
      {box(cx, cy)}
      <rect x={v ? cx - 7 : cx - 12} y={v ? cy - 12 : cy - 7}
        width={v ? 14 : 24} height={v ? 24 : 14} rx={2} fill="#fff" stroke={col} strokeWidth={2.5} />
      {tripped
        ? (v ? <><line x1={cx} y1={cy - 12} x2={cx} y2={cy - 3} stroke={col} strokeWidth={2.5} /><line x1={cx} y1={cy + 3} x2={cx} y2={cy + 12} stroke={col} strokeWidth={2.5} /></>
          : <><line x1={cx - 12} y1={cy} x2={cx - 3} y2={cy} stroke={col} strokeWidth={2.5} /><line x1={cx + 3} y1={cy} x2={cx + 12} y2={cy} stroke={col} strokeWidth={2.5} /></>)
        : (v ? <line x1={cx} y1={cy - 12} x2={cx} y2={cy + 12} stroke={col} strokeWidth={2.5} />
          : <line x1={cx - 12} y1={cy} x2={cx + 12} y2={cy} stroke={col} strokeWidth={2.5} />)}
    </g>
  );
}

function roundEl(x, y, label, glow, on) {
  const cx = center(x), cy = center(y);
  return (
    <g>
      {on && <circle cx={cx} cy={cy} r={20} fill={LAMP_ON} className="lamp-on-glow" />}
      <circle cx={cx} cy={cy} r={15} fill="#fff" stroke={glow ? LIVE : INK} strokeWidth={2} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight="700" fill={INK}>{label}</text>
    </g>
  );
}
const motorEl = (x, y, c, glow, on) => <g key={`m${x},${y}`}>{roundEl(x, y, "M", glow, on)}</g>;
const meterEl = (x, y, c, glow, kind) => <g key={`g${x},${y}`}>{roundEl(x, y, kind === "ammeter" ? "A" : "V", glow, false)}</g>;

function buzzerEl(x, y, c, glow, on) {
  const cx = center(x), cy = center(y);
  return (
    <g key={`z${x},${y}`}>
      {on && <circle cx={cx} cy={cy} r={19} fill={LAMP_ON} className="lamp-on-glow" />}
      <path d={`M ${cx - 14} ${cy + 8} A 14 14 0 0 1 ${cx + 14} ${cy + 8} Z`}
        fill="#fff" stroke={glow ? LIVE : INK} strokeWidth={2} strokeLinejoin="round" />
      <line x1={cx - 14} y1={cy + 8} x2={cx + 14} y2={cy + 8} stroke={glow ? LIVE : INK} strokeWidth={2} />
    </g>
  );
}

/* Kreuzung ohne Verbindung: die waagerechte Leitung springt über die senkrechte */
function crossEl(x, y, hv, vv) {
  const cx = center(x), cy = center(y);
  return (
    <g key={`xx${x},${y}`}>
      <line x1={cx} y1={cy - 30} x2={cx} y2={cy + 30} stroke={vv ? LIVE : WIRE} strokeWidth={8} strokeLinecap="round" />
      <path d={`M ${cx - 30} ${cy} L ${cx - 9} ${cy} A 9 9 0 0 0 ${cx + 9} ${cy} L ${cx + 30} ${cy}`}
        fill="none" stroke={BG} strokeWidth={13} strokeLinecap="round" />
      <path d={`M ${cx - 30} ${cy} L ${cx - 9} ${cy} A 9 9 0 0 0 ${cx + 9} ${cy} L ${cx + 30} ${cy}`}
        fill="none" stroke={hv ? LIVE : WIRE} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
}

function wallEl(x, y) {
  const cx = center(x), cy = center(y);
  return (
    <g key={`wl${x},${y}`}>
      <rect x={cx - 26} y={cy - 26} width={52} height={52} rx={6} fill={WALL} />
      <line x1={cx - 18} y1={cy - 18} x2={cx + 18} y2={cy + 18} stroke="#cbc4b3" strokeWidth={3} />
      <line x1={cx - 18} y1={cy + 18} x2={cx + 18} y2={cy - 18} stroke="#cbc4b3" strokeWidth={3} />
    </g>
  );
}

/* zeichnet eine Zelle; wird vom Brett und von der Symbol-Legende benutzt */
function cellGlyph(k, c, sim) {
  const [x, y] = k.split(",").map(Number);
  const glow = sim.glow.has(k);
  switch (c.type) {
    case "wall": return wallEl(x, y);
    case "cross": return crossEl(x, y, sim.liveNode.has(`ch:${k}`), sim.liveNode.has(`cv:${k}`));
    case "battery": return batteryEl(x, y, c, glow || sim.short, sim.short);
    case "switch": return switchEl(x, y, c, glow);
    case "button": return buttonEl(x, y, c, glow);
    case "spdt": return spdtEl(x, y, c, glow);
    case "lamp": return lampEl(x, y, c, sim.lit.has(k), sim.bright[k], sim.overload.has(k));
    case "led": return ledEl(x, y, c, sim.lit.has(k), sim.overload.has(k));
    case "resistor": return resistorEl(x, y, c, glow);
    case "fuse": return fuseEl(x, y, c, glow, sim.tripped.has(k));
    case "motor": return motorEl(x, y, c, glow, sim.lit.has(k));
    case "buzzer": return buzzerEl(x, y, c, glow, sim.lit.has(k));
    case "ammeter": case "voltmeter": return meterEl(x, y, c, glow, c.type);
    default: return null;
  }
}

/* eigene Werkzeug-Icons für Bauteile ohne passendes lucide-Symbol */
const SvgIco = ({ children }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const ResIcon = () => <SvgIco><path d="M1 12h4" /><rect x={5} y={8} width={14} height={8} rx={1} /><path d="M19 12h4" /></SvgIco>;
const LedIcon = () => <SvgIco><path d="M12 2v5" /><path d="M6 7h12l-6 9z" /><path d="M6 18h12" /><path d="M12 18v4" /></SvgIco>;
/* ================= Level ================= */
const spread = (str, obj) => {
  const o = {};
  str.split(/\s+/).filter(Boolean).forEach((k) => { o[k] = { ...obj }; });
  return o;
};
const wall = (s) => spread(s, { type: "wall" });
const wire = (s) => spread(s, { type: "wire" });
const lockw = (s) => spread(s, { type: "wire", lock: true });
const BASE = ["wire", "select", "erase"];

const CHAPTERS = [
  {
    name: "Der Stromkreis",
    levels: [
      {
        name: "Schließe den Kreis", W: 5, H: 3, palette: BASE,
        hint: "Ziehe Leitungen, sodass ein geschlossener Kreis von + über die Lampe zurück zu − entsteht. Nur dann fließt Strom.",
        lesson: "Strom fließt nur im geschlossenen Kreis.",
        cells: { "0,1": { type: "battery", orient: "v" }, "4,1": { type: "lamp", orient: "v" } },
      },
      {
        name: "Der Schalter", W: 5, H: 3, palette: BASE,
        hint: "Ein Schalter unterbricht den Kreis. Verdrahte ihn und tippe ihn mit „Schalten“ an.",
        lesson: "Ein Schalter ist eine gewollte Unterbrechung des Stromkreises.",
        cells: {
          "0,1": { type: "battery", orient: "v" }, "4,1": { type: "lamp", orient: "v" },
          "2,0": { type: "switch", orient: "h", closed: false }, ...wall("1,1 2,1 3,1"),
        },
      },
      {
        name: "Reihenschaltung = UND", W: 7, H: 3, palette: BASE,
        hint: "Zwei Schalter hintereinander. Verdrahte sie und prüfe alle vier Schalterstellungen.",
        lesson: "In Reihe geschaltete Schalter wirken wie UND: nur wenn alle geschlossen sind, fließt Strom.",
        cells: {
          "0,1": { type: "battery", orient: "v" }, "6,1": { type: "lamp", orient: "v" },
          "2,0": { type: "switch", orient: "h", closed: false },
          "4,0": { type: "switch", orient: "h", closed: false },
          ...wall("1,1 2,1 3,1 4,1 5,1"),
        },
        goals: [{ k: "logic", at: "6,1", expr: "and", inputs: ["2,0", "4,0"], live: true, label: "Lampe leuchtet nur, wenn BEIDE Schalter geschlossen sind" }],
      },
      {
        name: "Parallel – beide Lampen", W: 7, H: 3, palette: BASE,
        hint: "Beide Lampen hängen an denselben zwei Schienen. Verbinde die obere (+) und die untere (−) Schiene.",
        lesson: "Parallele Verbraucher liegen an derselben Spannung und sind voneinander unabhängig.",
        cells: {
          "0,1": { type: "battery", orient: "v" },
          "3,1": { type: "lamp", orient: "v" }, "5,1": { type: "lamp", orient: "v" },
          ...wall("1,1 2,1 4,1 6,1"),
        },
      },
      {
        name: "Wähle den Pfad", W: 7, H: 4, palette: BASE,
        hint: "Die grüne Lampe soll leuchten, die rot gestrichelte muss AUS bleiben.",
        lesson: "Der Strom fließt nur über geschlossene Pfade – du entscheidest, welcher das ist.",
        cells: {
          "0,1": { type: "battery", orient: "v" }, "0,2": { type: "wire" },
          "2,1": { type: "switch", orient: "v", closed: false }, "2,2": { type: "lamp", orient: "v", goal: "on" },
          "4,1": { type: "switch", orient: "v", closed: false }, "4,2": { type: "lamp", orient: "v", goal: "off" },
          ...wall("1,1 1,2 3,1 3,2 5,1 6,1 5,2 6,2"),
        },
      },
    ],
  },
  {
    name: "Kurzschluss & Schutz",
    levels: [
      {
        name: "Der Kurzschluss", W: 6, H: 3, palette: BASE, showValues: true,
        hint: "Die Lampe bleibt dunkel, obwohl der Kreis geschlossen ist. Eine Leitung überbrückt sie – finde und lösche sie.",
        lesson: "Ein Kurzschluss ist eine Verbindung von + nach − ohne Verbraucher. Der Strom nimmt den widerstandsärmsten Weg, der Rest bleibt dunkel.",
        cells: {
          "0,1": { type: "battery", orient: "v" }, "5,1": { type: "lamp", orient: "v" },
          ...wire("0,0 1,0 2,0 3,0 4,0 5,0 0,2 1,2 2,2 3,2 4,2 5,2 3,1"),
          ...wall("1,1 2,1 4,1"),
        },
      },
      {
        name: "Die Sicherung", W: 7, H: 3, palette: BASE, showValues: true,
        hint: "Die Sicherung hat ausgelöst und trennt den Kreis. Beseitige die Ursache, dann hält sie wieder.",
        lesson: "Eine Sicherung trennt den Kreis, wenn der Strom zu groß wird – sie schützt Leitung und Quelle.",
        cells: {
          "0,1": { type: "battery", orient: "v" }, "6,1": { type: "lamp", orient: "v" },
          "2,0": { type: "fuse", orient: "h", imax: 0.5 },
          ...wire("0,0 1,0 3,0 4,0 5,0 6,0 0,2 1,2 2,2 3,2 4,2 5,2 6,2 4,1"),
          ...wall("1,1 2,1 3,1 5,1"),
        },
        goals: [{ k: "fuse" }],
      },
      {
        name: "Die LED hat eine Polung", W: 6, H: 3, palette: BASE, showValues: true,
        hint: "Verdrahte den Kreis. Eine LED leitet nur in eine Richtung – tippe sie mit „Schalten“ an, um sie zu drehen.",
        lesson: "Die LED leitet nur von Anode zur Kathode (Balken). Falsch gepolt sperrt sie vollständig.",
        cells: {
          "0,1": { type: "battery", orient: "v" },
          "2,0": { type: "resistor", orient: "h", r: 470 },
          "5,1": { type: "led", orient: "v", rev: true, flip: true },
          ...wall("1,1 2,1 3,1 4,1"),
        },
      },
      {
        name: "Der Vorwiderstand", W: 7, H: 3, palette: BASE, showValues: true,
        hint: "Die LED verträgt höchstens 30 mA. Verdrahte den Kreis und tippe den Widerstand an, um seinen Wert zu wechseln – gesucht sind 12–18 mA.",
        lesson: "Eine LED braucht immer einen Vorwiderstand: R = (Uq − UF) / I.",
        cells: {
          "0,1": { type: "battery", orient: "v" },
          "2,0": { type: "resistor", orient: "h", values: [100, 330, 470, 1000], r: 100 },
          "4,0": { type: "ammeter", orient: "h" },
          "6,1": { type: "led", orient: "v" },
          ...wall("1,1 2,1 3,1 4,1 5,1"),
        },
        goals: [{ k: "read", type: "ammeter", min: 0.012, max: 0.018, label: "Der LED-Strom liegt zwischen 12 und 18 mA" }],
      },
    ],
  },
  {
    name: "Schalter & Logik",
    levels: [
      {
        name: "Der Taster", W: 6, H: 3, palette: BASE,
        hint: "Ein Taster ist ein Schließer: er leitet nur, solange du ihn gedrückt hältst. Halte ihn mit „Schalten“ gedrückt.",
        lesson: "Taster (Schließer) leiten nur während der Betätigung – z. B. eine Klingel.",
        cells: {
          "0,1": { type: "battery", orient: "v" }, "5,1": { type: "lamp", orient: "v" },
          "2,0": { type: "button", orient: "h", closed: false },
          ...wall("1,1 2,1 3,1 4,1"),
        },
        goals: [{ k: "logic", at: "5,1", expr: "id", inputs: ["2,0"], label: "Lampe leuchtet genau dann, wenn der Taster gedrückt ist" }],
      },
      {
        name: "Parallel = ODER", W: 7, H: 4, palette: BASE,
        hint: "Führe zwei Wege zwischen linker und rechter Schiene – über jeden Schalter einen. Die Rückleitung läuft unten.",
        lesson: "Parallel geschaltete Schalter wirken wie ODER: einer genügt.",
        cells: {
          "0,2": { type: "battery", orient: "v" }, "6,2": { type: "lamp", orient: "v" },
          "3,0": { type: "switch", orient: "h", closed: false },
          "3,1": { type: "switch", orient: "h", closed: false },
          ...wall("1,2 2,2 3,2 4,2 5,2"),
        },
        goals: [{ k: "logic", at: "6,2", expr: "or", inputs: ["3,0", "3,1"], label: "Lampe leuchtet, wenn MINDESTENS EIN Schalter geschlossen ist" }],
      },
      {
        name: "Der Wechselschalter", W: 5, H: 5, palette: BASE,
        hint: "Der Wechselschalter verbindet seinen Wurzelanschluss mit einem von zwei Ausgängen – an jedem hängt eine Lampe. Führe von den äußeren Lampenanschlüssen eine gemeinsame Rückleitung zur Quelle.",
        lesson: "Der Wechselschalter (Umschalter) schaltet nicht ein und aus, sondern um.",
        cells: {
          "1,2": { type: "battery", orient: "h" },
          "3,2": { type: "spdt", dir: "W", pos: 0 },
          "3,1": { type: "lamp", orient: "v" }, "3,3": { type: "lamp", orient: "v" },
          ...wall("2,1 2,3"),
        },
        goals: [
          { k: "logic", at: "3,1", expr: "not", inputs: ["3,2"], label: "Obere Lampe leuchtet in Stellung 1" },
          { k: "logic", at: "3,3", expr: "id", inputs: ["3,2"], label: "Untere Lampe leuchtet in Stellung 2" },
        ],
      },
      {
        name: "Die Wechselschaltung", W: 7, H: 6, palette: BASE,
        hint: "Flurlicht: Quelle, Lampe und Rückleitung sind fest verlegt. Verbinde die beiden Wechselschalter mit zwei getrennten Korrespondierenden Leitungen (oben und unten).",
        lesson: "Wechselschaltung: zwei Wechselschalter, zwei korrespondierende Leitungen – jeder Schalter schaltet das Licht um.",
        cells: {
          "0,3": { type: "battery", orient: "v" }, "6,3": { type: "lamp", orient: "v" },
          "2,2": { type: "spdt", dir: "W", pos: 0 }, "4,2": { type: "spdt", dir: "E", pos: 0 },
          ...lockw("0,2 1,2 5,2 6,2 0,4 0,5 1,5 2,5 3,5 4,5 5,5 6,5 6,4"),
          ...wall("1,1 5,1 1,3 5,3 3,2 2,4 3,4 4,4"),
        },
        goals: [{ k: "toggle", at: "6,3", inputs: ["2,2", "4,2"], label: "Jeder der beiden Schalter schaltet das Licht um" }],
      },
      {
        name: "Motor und Summer", W: 7, H: 4, palette: BASE,
        hint: "Zwei Verbraucher, jeder mit eigenem Schalter – parallel an einer gemeinsamen Plus- und Minusschiene.",
        lesson: "Jeder Verbraucher bekommt seinen eigenen Schalter in seinem eigenen Zweig.",
        cells: {
          "0,2": { type: "battery", orient: "v" },
          "3,1": { type: "switch", orient: "v", closed: false },
          "5,1": { type: "switch", orient: "v", closed: false },
          "3,2": { type: "motor", orient: "v" }, "5,2": { type: "buzzer", orient: "v" },
          ...wall("1,1 2,1 4,1 6,1 1,2 2,2 4,2 6,2"),
        },
        goals: [
          { k: "logic", at: "3,2", expr: "id", inputs: ["3,1"], label: "Motor läuft nur mit dem linken Schalter" },
          { k: "logic", at: "5,2", expr: "id", inputs: ["5,1"], label: "Summer summt nur mit dem rechten Schalter" },
        ],
      },
    ],
  },
  {
    name: "Größen & Messen",
    levels: [
      {
        name: "Der Widerstand", W: 7, H: 3, palette: BASE, showValues: true,
        hint: "Verdrahte den Kreis. Der Widerstand begrenzt den Strom – beobachte Amperemeter und Helligkeit.",
        lesson: "Ein Widerstand begrenzt den Strom. Mehr Widerstand im Kreis heißt weniger Strom.",
        cells: {
          "0,1": { type: "battery", orient: "v" }, "6,1": { type: "lamp", orient: "v" },
          "2,0": { type: "ammeter", orient: "h" }, "4,0": { type: "resistor", orient: "h", r: 100 },
          ...wall("1,1 2,1 3,1 4,1 5,1"),
        },
        goals: [{ k: "read", type: "ammeter", min: 0.04, max: 0.055, label: "Das Amperemeter zeigt etwa 47 mA" }],
      },
      {
        name: "Amperemeter in Reihe", W: 6, H: 3, palette: ["wire", "ammeter", "select", "erase"], showValues: true,
        hint: "Setze das Amperemeter so ein, dass es den Lampenstrom misst – und die Lampe weiter leuchtet.",
        lesson: "Ein Amperemeter wird IN REIHE eingebaut. Parallel geschaltet würde es den Verbraucher kurzschließen.",
        cells: { "0,1": { type: "battery", orient: "v" }, "4,1": { type: "lamp", orient: "v" } },
        goals: [{ k: "read", type: "ammeter", min: 0.09, max: 0.11, label: "Das Amperemeter zeigt etwa 100 mA" }],
      },
      {
        name: "Voltmeter parallel", W: 6, H: 4, palette: ["wire", "voltmeter", "select", "erase"], showValues: true,
        hint: "Miss die Spannung an der Lampe. Das Voltmeter braucht einen eigenen Zweig neben der Lampe.",
        lesson: "Ein Voltmeter wird PARALLEL zum Bauteil geschaltet. In Reihe würde es den Kreis praktisch sperren.",
        cells: { "0,1": { type: "battery", orient: "v" }, "4,1": { type: "lamp", orient: "v" } },
        goals: [{ k: "read", type: "voltmeter", min: 8.4, max: 9.05, label: "Das Voltmeter zeigt die Lampenspannung (≈ 9 V)" }],
      },
      {
        name: "Reihe teilt die Spannung", W: 5, H: 4, palette: ["wire", "voltmeter", "select", "erase"], showValues: true,
        hint: "Zwei gleiche Lampen liegen in Reihe. Miss mit dem Voltmeter die Spannung an der linken Lampe.",
        lesson: "In Reihe teilt sich die Spannung auf die Verbraucher auf – bei zwei gleichen Lampen je die Hälfte.",
        cells: {
          "1,1": { type: "lamp", orient: "h" }, "3,1": { type: "lamp", orient: "h" },
          "2,3": { type: "battery", orient: "h" },
          ...lockw("0,1 2,1 4,1 0,2 0,3 1,3 3,3 4,3 4,2"),
        },
        goals: [{ k: "read", type: "voltmeter", min: 3.9, max: 4.9, label: "Das Voltmeter zeigt etwa 4,5 V – die halbe Quellenspannung" }],
      },
      {
        name: "Parallel teilt den Strom", W: 7, H: 3, palette: ["wire", "ammeter", "select", "erase"], showValues: true,
        hint: "Der Kreis ist fertig verdrahtet. Miss den Gesamtstrom: lösche eine Leitung in der Hauptleitung und setze dort das Amperemeter ein.",
        lesson: "In der Parallelschaltung teilt sich der Strom auf die Zweige auf – der Gesamtstrom ist die Summe.",
        cells: {
          "0,1": { type: "battery", orient: "v" },
          "3,1": { type: "lamp", orient: "v" }, "5,1": { type: "lamp", orient: "v" },
          ...wire("0,0 1,0 2,0 3,0 4,0 5,0 6,0 0,2 1,2 2,2 3,2 4,2 5,2 6,2"),
          ...wall("1,1 2,1 4,1 6,1"),
        },
        goals: [{ k: "read", type: "ammeter", min: 0.17, max: 0.22, label: "Das Amperemeter zeigt den Gesamtstrom (≈ 200 mA)" }],
      },
      {
        name: "Ohmsches Gesetz", W: 7, H: 3, palette: BASE, showValues: true,
        hint: "Die Quelle liefert 9 V, die Lampe hat 90 Ω. Der Strom soll 30 mA betragen. Rechne R = U / I − 90 Ω und tippe den Widerstand an, bis der Wert passt.",
        lesson: "R = U / I. Der Gesamtwiderstand einer Reihenschaltung ist die Summe aller Widerstände.",
        cells: {
          "0,1": { type: "battery", orient: "v" }, "6,1": { type: "lamp", orient: "v" },
          "2,0": { type: "resistor", orient: "h", values: [100, 220, 300, 470, 1000], r: 100 },
          "4,0": { type: "ammeter", orient: "h" },
          ...wall("1,1 2,1 3,1 4,1 5,1"),
        },
        goals: [{ k: "read", type: "ammeter", min: 0.028, max: 0.032, label: "Der Strom beträgt 30 mA (± 2 mA)" }],
      },
    ],
  },
  {
    name: "Schaltplan lesen",
    levels: [
      {
        /* Fertig verdrahtet ausgeliefert, an den vier Kreuzungsstellen aber mit
           gewöhnlichen Leitungen: dadurch verschmilzt alles zu einem Knoten und
           beide Quellen sind kurzgeschlossen. Die vier Knotenpunkte sind der
           einzige Hinweis – hier wird der Knotenpunkt zum Rätselgegenstand. */
        name: "Knotenpunkt oder Kreuzung?", W: 7, H: 5, palette: ["cross", "wire", "erase"],
        showValues: true,
        hint: "Zwei getrennte Stromkreise – trotzdem Kurzschluss. Die vier Knotenpunkte zeigen, wo die Leitungen elektrisch verbunden sind. Lösche sie und setze dort „Kreuzung“ ein.",
        lesson: "Ein Knotenpunkt verbindet drei oder mehr Leitungen elektrisch. Ohne ihn kreuzen sich zwei Leitungen nur.",
        cells: {
          "0,2": { type: "battery", orient: "v" }, "6,2": { type: "lamp", orient: "v" },
          "3,0": { type: "battery", orient: "h" }, "3,4": { type: "lamp", orient: "h" },
          ...lockw("0,1 1,1 3,1 5,1 6,1 0,3 1,3 3,3 5,3 6,3 2,0 2,2 2,4 4,0 4,2 4,4"),
          ...wire("2,1 4,1 2,3 4,3"),
          ...wall("1,0 5,0 1,4 5,4 1,2 3,2 5,2"),
        },
      },
      {
        /* Ungleiche Zweige (90 Ω / 60 Ω), damit sich die Ströme sichtbar addieren
           statt bloß zu halbieren: 99 mA + 148 mA = 247 mA. Zwischen Quelle und
           unterem Knoten liegt mit 3,2 / 3,3 eine gerade Stammleitung – nur dort
           misst das Amperemeter den Gesamtstrom, im Zweig den Zweigstrom. */
        name: "Am Knotenpunkt teilt sich der Strom", W: 7, H: 5,
        palette: ["wire", "ammeter", "erase"], showValues: true,
        hint: "Die Knotenpunkte aus dem letzten Level – hier sind sie gewollt. Setze das Amperemeter so ein, dass es nur den Strom durch die Lampe misst.",
        lesson: "Am Knotenpunkt gilt: was hineinfließt, fließt wieder heraus. 99 mA + 148 mA = 247 mA.",
        cells: {
          "3,1": { type: "battery", orient: "v" },
          "0,1": { type: "lamp", orient: "v" }, "6,1": { type: "motor", orient: "v" },
          ...wire("0,0 1,0 2,0 3,0 4,0 5,0 6,0 0,2 0,3 3,2 3,3 6,2 6,3 0,4 1,4 2,4 3,4 4,4 5,4 6,4"),
          ...wall("1,1 2,1 4,1 5,1 1,2 2,2 4,2 5,2 1,3 2,3 4,3 5,3"),
        },
        goals: [{ k: "read", type: "ammeter", min: 0.09, max: 0.11, label: "Das Amperemeter zeigt nur den Lampenstrom (99 mA)" }],
      },
      {
        name: "Anders gezeichnet – UND", W: 7, H: 5, palette: BASE,
        hint: "Zwei Schalter in Reihe – dieselbe UND-Schaltung wie in Level 3 „Reihenschaltung = UND“. Nur läuft der Kreis diesmal außen um das Feld herum statt auf einer Linie.",
        lesson: "Ein Schaltplan zeigt die elektrische Verschaltung, nicht die räumliche Anordnung der Bauteile. Dieselbe Schaltung kann daher auf unterschiedliche Weise gezeichnet werden, solange die elektrischen Verbindungen unverändert bleiben.",
        cells: {
          "0,2": { type: "battery", orient: "v" }, "6,2": { type: "lamp", orient: "v" },
          "3,0": { type: "switch", orient: "h", closed: false },
          "3,4": { type: "switch", orient: "h", closed: false },
          ...wall("1,1 2,1 3,1 4,1 5,1 1,2 2,2 3,2 4,2 5,2 1,3 2,3 3,3 4,3 5,3"),
        },
        goals: [{ k: "logic", at: "6,2", expr: "and", inputs: ["3,0", "3,4"], live: true, label: "Die Lampe leuchtet nur, wenn beide Schalter geschlossen sind" }],
      },
      {
        name: "Zwei Quellen in Reihe", W: 7, H: 3, palette: BASE, showValues: true,
        hint: "Die Lampe braucht 18 V. Verdrahte beide Quellen in Reihe – tippe die zweite Quelle an, um ihre Polung zu drehen.",
        lesson: "In Reihe addieren sich die Spannungen – aber nur, wenn Plus an Minus liegt. Gegeneinander gepolt heben sie sich auf.",
        cells: {
          "0,1": { type: "battery", orient: "v" },
          "3,0": { type: "battery", orient: "h", rev: true, flip: true },
          "6,1": { type: "lamp", orient: "v", r: 360, un: 18, in: 0.05 },
          ...wall("1,1 2,1 3,1 4,1 5,1"),
        },
      },
    ],
  },
];

const LEVELS = CHAPTERS.flatMap((ch, ci) => ch.levels.map((l) => ({ ...l, ch: ci })));
const SANDBOX = {
  name: "Frei bauen", W: 9, H: 6, showValues: true,
  cells: { "1,2": { type: "battery", orient: "v" }, "7,2": { type: "lamp", orient: "v" } },
};

/* ================= Ziele ================= */
const CNAME = { lamp: "Die Lampe", led: "Die LED", motor: "Der Motor", buzzer: "Der Summer" };
const PLUR = { lamp: "Lampen", led: "LEDs", motor: "Motoren", buzzer: "Summer" };
const ONW = { lamp: "leuchtet", led: "leuchtet", motor: "läuft", buzzer: "summt" };
const ONWP = { lamp: "leuchten", led: "leuchten", motor: "laufen", buzzer: "summen" };
const EXPR = {
  and: (s) => s.every(Boolean), or: (s) => s.some(Boolean),
  xor: (s) => s.filter(Boolean).length % 2 === 1,
  id: (s) => !!s[0], not: (s) => !s[0],
};

function deriveGoals(level, grid) {
  const explicit = level.goals || [];
  const covered = new Set(explicit.filter((g) => g.at).map((g) => g.at));
  /* gleiche Verbraucher mit gleichem Ziel zu einer Zeile zusammenfassen */
  const groups = new Map();
  for (const [k, c] of Object.entries(grid)) {
    if (!CONSUMER.has(c.type) || covered.has(k)) continue;
    const on = c.goal !== "off", gk = `${c.type}|${on}`;
    if (!groups.has(gk)) groups.set(gk, { k: "on", type: c.type, on, ats: [] });
    groups.get(gk).ats.push(k);
  }
  return [...groups.values(), ...explicit];
}

function checkLevel(level, grid, sim) {
  const goals = deriveGoals(level, grid);
  const items = [];
  /* alle Ziele, die über Schalterkombinationen geprüft werden */
  const lg = goals.filter((g) => g.k === "logic" || g.k === "toggle");
  let inputs = null, combos = null;
  if (lg.length) {
    inputs = [...new Set(lg.flatMap((g) => g.inputs))];
    combos = [];
    for (let m = 0; m < 1 << inputs.length; m++) {
      const g2 = JSON.parse(JSON.stringify(grid));
      const st = inputs.map((key, i) => {
        const on = !!((m >> i) & 1), c = g2[key];
        if (c) { if (c.type === "spdt") c.pos = on ? 1 : 0; else c.closed = on; }
        return on;
      });
      combos.push({ st, sim: simulate(g2) });
    }
  }
  for (const g of goals) {
    if (g.k === "on") {
      const ats = g.ats || [g.at];
      const c = grid[ats[0]]; if (!c) continue;
      const n = ats.length;
      const t = g.label || (n > 1
        ? `${n === 2 ? "Beide" : `Alle ${n}`} ${PLUR[c.type]} ${g.on ? ONWP[c.type] : "bleiben aus"}`
        : `${CNAME[c.type] || "Das Bauteil"} ${g.on ? ONW[c.type] || "arbeitet" : "bleibt aus"}`);
      items.push({ t, ok: ats.every((a) => sim.lit.has(a) === g.on) });
    } else if (g.k === "read") {
      const cand = g.at ? [g.at] : Object.keys(grid).filter((k) => grid[k].type === g.type);
      const ok = cand.some((k) => {
        const v = Math.abs((grid[k].type === "voltmeter" ? sim.volt[k] : sim.cur[k]) || 0);
        return v >= g.min && v <= g.max;
      });
      items.push({ t: g.label, ok });
    } else if (g.k === "logic") {
      const ix = g.inputs.map((key) => inputs.indexOf(key));
      /* live: zusätzlich muss die Schaltung gerade wirklich durchgeschaltet sein */
      const ok = combos.every((cb) =>
        !cb.sim.short && cb.sim.lit.has(g.at) === !!EXPR[g.expr](ix.map((i) => cb.st[i])))
        && (!g.live || sim.lit.has(g.at));
      items.push({ t: g.label, ok });
    } else if (g.k === "toggle") {
      /* Umschalt-Eigenschaft: jeder einzelne Schalter kehrt den Zustand um.
         Erfüllt sowohl die XOR- als auch die XNOR-Verdrahtung. */
      const ix = g.inputs.map((key) => inputs.indexOf(key));
      const ok = combos.every((cb, m) => !cb.sim.short && ix.every((i) => {
        const other = combos[m ^ (1 << i)];
        return cb.sim.lit.has(g.at) !== other.sim.lit.has(g.at);
      }));
      items.push({ t: g.label, ok });
    } else if (g.k === "fuse") {
      items.push({ t: g.label || "Die Sicherung hält", ok: sim.tripped.size === 0 });
    }
  }
  if (sim.short) items.push({ t: "Kein Kurzschluss", ok: false });
  if (sim.overload.size) items.push({ t: "Kein Bauteil überlastet", ok: false });
  return { items, won: items.length > 0 && items.every((i) => i.ok) };
}
/* ================= Werkzeuge ================= */
const TOOLS = {
  wire: { icon: Cable, label: "Leitung" },
  cross: { icon: X, label: "Kreuzung" },
  switch: { icon: ToggleRight, label: "Schalter" },
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
  battery: { icon: Battery, label: "Quelle" },
  select: { icon: MousePointer2, label: "Schalten" },
  erase: { icon: Eraser, label: "Löschen" },
};
const SANDBOX_PALETTE = ["wire", "cross", "battery", "lamp", "led", "resistor", "switch",
  "button", "spdt", "motor", "buzzer", "fuse", "ammeter", "voltmeter", "select", "erase"];
const PLACEABLE = new Set(["cross", "battery", "lamp", "led", "resistor", "switch",
  "button", "spdt", "motor", "buzzer", "fuse", "ammeter", "voltmeter"]);

const EMPTY_SIM = {
  glow: new Set(), liveNode: new Set(), lit: new Set(), bright: {},
  overload: new Set(), tripped: new Set(), short: false,
};
const LEGEND = [
  [{ type: "battery", orient: "h" }, "Spannungsquelle", "9 V, mit kleinem Innenwiderstand"],
  [{ type: "lamp", orient: "h" }, "Lampe", "Verbraucher; im Normplan ein Kreis mit Kreuz"],
  [{ type: "resistor", orient: "h" }, "Widerstand", "begrenzt den Strom"],
  [{ type: "led", orient: "h" }, "LED", "leitet nur in Pfeilrichtung, braucht Vorwiderstand"],
  [{ type: "switch", orient: "h", closed: false }, "Schalter", "bleibt in seiner Stellung"],
  [{ type: "button", orient: "h", closed: false }, "Taster", "leitet nur während der Betätigung"],
  [{ type: "spdt", dir: "W", pos: 0 }, "Wechselschalter", "schaltet zwischen zwei Ausgängen um"],
  [{ type: "fuse", orient: "h" }, "Sicherung", "trennt bei Überstrom"],
  [{ type: "ammeter", orient: "h" }, "Amperemeter", "misst Strom – IN REIHE einbauen"],
  [{ type: "voltmeter", orient: "h" }, "Voltmeter", "misst Spannung – PARALLEL einbauen"],
  [{ type: "motor", orient: "h" }, "Motor", "wandelt Strom in Bewegung"],
  [{ type: "buzzer", orient: "h" }, "Summer", "akustischer Verbraucher"],
  [{ type: "cross" }, "Kreuzung", "Leitungen kreuzen sich OHNE Verbindung"],
];

export default function App() {
  const [mode, setMode] = useState("level");
  const [levelIndex, setLevelIndex] = useState(0);
  const [grid, setGrid] = useState(() => JSON.parse(JSON.stringify(LEVELS[0].cells)));
  const [tool, setTool] = useState("wire");
  const [orient, setOrient] = useState("h");
  const [completed, setCompleted] = useState(new Set());
  const [overlay, setOverlay] = useState(null);   // "levels" | "legend" | null
  const svgRef = useRef(null);
  const drawing = useRef(false);
  const pressed = useRef(null);

  const cfg = mode === "sandbox" ? SANDBOX : LEVELS[levelIndex];
  const { W, H } = cfg;
  const palette = mode === "sandbox" ? SANDBOX_PALETTE : cfg.palette;

  const sim = useMemo(() => simulate(grid), [grid]);
  const check = useMemo(
    () => (mode === "level" ? checkLevel(cfg, grid, sim) : { items: [], won: false }),
    [mode, cfg, grid, sim]
  );
  const won = check.won;

  useEffect(() => {
    if (won) setCompleted((s) => (s.has(levelIndex) ? s : new Set([...s, levelIndex])));
  }, [won, levelIndex]);

  /* ---- Änderungen am Feld ---- */
  const setWire = (x, y) => setGrid((p) => {
    const k = `${x},${y}`;
    return p[k] ? p : { ...p, [k]: { type: "wire", user: true } };
  });
  const eraseCell = (x, y) => setGrid((p) => {
    const k = `${x},${y}`, c = p[k];
    if (!c) return p;
    if (mode === "level" && !((c.type === "wire" && !c.lock) || c.user)) return p;
    const n = { ...p }; delete n[k]; return n;
  });
  const placeComp = (x, y, type) => setGrid((p) => {
    const k = `${x},${y}`;
    if (p[k]) return p;
    const cell = { type, user: true };
    if (type !== "cross") cell.orient = orient;
    if (type === "switch" || type === "button") cell.closed = false;
    if (type === "spdt") { cell.dir = orient === "h" ? "W" : "N"; cell.pos = 0; }
    return { ...p, [k]: cell };
  });
  const interact = (x, y) => setGrid((p) => {
    const k = `${x},${y}`, c = p[k];
    if (!c) return p;
    if (c.type === "switch") return { ...p, [k]: { ...c, closed: !c.closed } };
    if (c.type === "button") { pressed.current = k; return { ...p, [k]: { ...c, closed: true } }; }
    if (c.type === "spdt") return { ...p, [k]: { ...c, pos: c.pos ? 0 : 1 } };
    if (c.values) {
      const i = (c.values.indexOf(c.r) + 1) % c.values.length;
      return { ...p, [k]: { ...c, r: c.values[i] } };
    }
    if (c.flip) return { ...p, [k]: { ...c, rev: !c.rev } };
    return p;
  });
  const release = () => {
    const k = pressed.current;
    if (!k) return;
    pressed.current = null;
    setGrid((p) => (p[k] ? { ...p, [k]: { ...p[k], closed: false } } : p));
  };

  const eventCell = (e) => {
    const svg = svgRef.current; if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width * (W * CELL)) / CELL);
    const y = Math.floor(((e.clientY - r.top) / r.height * (H * CELL)) / CELL);
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    return [x, y];
  };
  const onDown = (e) => {
    e.preventDefault();
    const c = eventCell(e); if (!c) return;
    drawing.current = true;
    if (tool === "wire") setWire(c[0], c[1]);
    else if (tool === "erase") eraseCell(c[0], c[1]);
    else if (tool === "select") interact(c[0], c[1]);
    else placeComp(c[0], c[1], tool);
  };
  const onMove = (e) => {
    if (!drawing.current) return;
    const c = eventCell(e); if (!c) return;
    if (tool === "wire") setWire(c[0], c[1]);
    else if (tool === "erase") eraseCell(c[0], c[1]);
  };
  const stop = () => { drawing.current = false; release(); };

  const resetGrid = () => setGrid(JSON.parse(JSON.stringify(cfg.cells)));
  const clearGrid = () => setGrid({});

  /* Level und Feld werden immer zusammen gesetzt. Beide Updates liegen im selben
     Event-Batch, es gibt also keinen Render, in dem cfg und grid zu verschiedenen
     Leveln gehören: weder bleibt die alte Schaltung stehen, noch sieht die
     Zielprüfung ein fremdes Feld und trägt das neue Level sofort als gelöst ein. */
  const loadBoard = (cells) => {
    setGrid(JSON.parse(JSON.stringify(cells)));
    setTool("wire");
    setOrient("h");
    drawing.current = false;
    pressed.current = null;
  };
  const goLevel = (i) => {
    const n = Math.max(0, Math.min(LEVELS.length - 1, i));
    setMode("level");
    setLevelIndex(n);
    loadBoard(LEVELS[n].cells);
    setOverlay(null);
  };
  const goSandbox = () => { setMode("sandbox"); loadBoard(SANDBOX.cells); };

  /* ---- Brett zeichnen ---- */
  const dotEls = [], wallEls = [], lineEls = [], flowEls = [], nodeEls = [], compEls = [], labelEls = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    dotEls.push(<circle key={`d${x},${y}`} cx={center(x)} cy={center(y)} r={1.6} fill={DOT} />);

  sim.lines.forEach((ln, i) => {
    /* gegen die Stromrichtung gezeichnete Stücke werden umgedreht – die Striche
       laufen immer vom Anfang zum Ende der Linie */
    const [p, q] = ln.dir < 0 ? [ln.b, ln.a] : [ln.a, ln.b];
    const x1 = center(p[0]), y1 = center(p[1]), x2 = center(q[0]), y2 = center(q[1]);
    lineEls.push(<line key={`ln${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={ln.live ? (sim.short ? HOT : LIVE) : WIRE} strokeWidth={8} strokeLinecap="round" />);
    if (ln.live) flowEls.push(<line key={`fl${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={FLOW} strokeWidth={3.5} strokeLinecap="round" className={sim.short ? "flow fast" : "flow"} />);
  });

  const label = (k, txt) => {
    const [x, y] = k.split(",").map(Number);
    labelEls.push(
      <text key={`t${k}`} x={center(x)} y={center(y) + 27} textAnchor="middle" fontSize={10.5}
        fontWeight="600" fill={INK} stroke={BG} strokeWidth={3} paintOrder="stroke">{txt}</text>
    );
  };

  for (const [k, c] of Object.entries(grid)) {
    if (c.type === "wall") { wallEls.push(wallEl(...k.split(",").map(Number))); continue; }
    if (c.type === "wire") {
      const [x, y] = k.split(",").map(Number), d = sim.deg[k] || 0;
      /* Knotenpunkt: groß und mit hellem Ring, sonst geht er auf der
         stromführenden Leitung farblich unter. Loses Ende: kleiner Kreis. */
      const node = d >= 3, r = node ? 7 : d <= 1 ? 4 : 0;
      if (r) nodeEls.push(<circle key={`wn${k}`} cx={center(x)} cy={center(y)} r={r}
        fill={sim.liveNode.has(`w:${k}`) ? (sim.short ? HOT : LIVE) : WIRE}
        stroke={node ? BG : "none"} strokeWidth={node ? 2.5 : 0} />);
      continue;
    }
    compEls.push(cellGlyph(k, c, sim));
    /* Messwerte und Bauteilwerte */
    if (c.type === "ammeter") label(k, fmtA(sim.cur[k] || 0));
    else if (c.type === "voltmeter") label(k, fmtV(sim.volt[k] || 0));
    else if (c.type === "resistor") label(k, fmtR(P(c, "r")) + (c.values ? " ⟳" : ""));
    else if (c.type === "fuse") label(k, sim.tripped.has(k) ? "ausgelöst" : fmtA(P(c, "imax")));
    else if (cfg.showValues) {
      if (c.type === "battery") label(k, `${fmtV(P(c, "u"))} · ${fmtA(sim.cur[k] || 0)}`);
      else if (CONSUMER.has(c.type)) label(k, sim.blocked.has(k) ? "sperrt" : fmtA(sim.cur[k] || 0));
    }
  }

  const status = !sim.hasBattery ? "Keine Quelle vorhanden"
    : sim.short ? "Kurzschluss!"
      : sim.closed ? `Strom fließt · ${fmtA(sim.ibatt)}`
        : "Kein geschlossener Stromkreis";
  const chapter = mode === "level" ? CHAPTERS[cfg.ch] : null;

  return (
    <div className="w-full min-h-screen bg-stone-50 text-stone-800 p-3 sm:p-5 flex flex-col items-center font-sans">
      <style>{`
        .flow{stroke-dasharray:7 17;animation:flowmove .7s linear infinite}
        .flow.fast{animation-duration:.22s}
        @keyframes flowmove{to{stroke-dashoffset:-24}}
        .lamp-on-glow{opacity:.28;animation:lampp 1.5s ease-in-out infinite}
        @keyframes lampp{0%,100%{opacity:.2}50%{opacity:.42}}
      `}</style>

      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="text-amber-500" size={26} />
          <h1 className="text-xl font-bold tracking-tight">Stromkreis</h1>
          <span className="ml-auto text-xs text-stone-400">{completed.size}/{LEVELS.length} gelöst</span>
          <button onClick={() => setOverlay("legend")} title="Symbole"
            className="p-1.5 rounded-lg bg-stone-200 text-stone-600"><BookOpen size={16} /></button>
        </div>

        <div className="flex gap-1 mb-3 bg-stone-200 p-1 rounded-xl text-sm">
          <button onClick={() => { if (mode !== "level") goLevel(levelIndex); }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition ${mode === "level" ? "bg-white shadow text-stone-900" : "text-stone-500"}`}>Level</button>
          <button onClick={() => { if (mode !== "sandbox") goSandbox(); }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition ${mode === "sandbox" ? "bg-white shadow text-stone-900" : "text-stone-500"}`}>Frei bauen</button>
        </div>

        {mode === "level" && (
          <div className="flex items-center justify-between mb-2 gap-2">
            <button onClick={() => goLevel(levelIndex - 1)} disabled={levelIndex === 0}
              className="p-2 rounded-lg bg-stone-200 disabled:opacity-40"><ArrowLeft size={18} /></button>
            <button onClick={() => setOverlay("levels")} className="flex-1 text-center">
              <div className="text-xs text-stone-500 flex items-center justify-center gap-1">
                <LayoutGrid size={11} />{chapter.name} · {levelIndex + 1}/{LEVELS.length}
              </div>
              <div className="font-semibold flex items-center gap-1 justify-center">
                {cfg.name}{completed.has(levelIndex) && <CheckCircle2 size={16} className="text-emerald-500" />}
              </div>
            </button>
            <button onClick={() => goLevel(levelIndex + 1)} disabled={levelIndex === LEVELS.length - 1}
              className="p-2 rounded-lg bg-stone-200 disabled:opacity-40"><ArrowRight size={18} /></button>
          </div>
        )}

        <div className="rounded-2xl p-2 shadow-inner" style={{ background: BG }}>
          <svg ref={svgRef} viewBox={`0 0 ${W * CELL} ${H * CELL}`}
            className="block mx-auto select-none"
            style={{ width: "100%", maxWidth: Math.min(W * CELL, 560), height: "auto", touchAction: "none", cursor: tool === "erase" ? "cell" : "pointer" }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={stop}
            onPointerLeave={stop} onPointerCancel={stop}>
            <rect x={0} y={0} width={W * CELL} height={H * CELL} fill={BG} rx={10} />
            {dotEls}{wallEls}{lineEls}{flowEls}{nodeEls}{compEls}{labelEls}
          </svg>
        </div>

        {/* Status */}
        <div className={`mt-2 text-sm font-medium flex items-center gap-1.5 ${sim.short ? "text-red-600" : sim.closed ? "text-amber-600" : "text-stone-400"}`}>
          {sim.short && <AlertTriangle size={15} />}{status}
          {mode === "sandbox" && sim.lit.size > 0 && <span className="text-stone-400">· {sim.lit.size} Verbraucher aktiv</span>}
        </div>
        {sim.short && (
          <div className="mt-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
            + und − sind ohne Verbraucher verbunden. Der Strom umgeht die Bauteile – in der Realität würden Leitung und Quelle heiß.
          </div>
        )}

        {/* Ziele */}
        {mode === "level" && (
          won ? (
            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle2 size={18} /> Geschafft!</span>
                {levelIndex < LEVELS.length - 1
                  ? <button onClick={() => goLevel(levelIndex + 1)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-1">Weiter <ArrowRight size={15} /></button>
                  : <span className="text-sm text-emerald-700 font-medium">Alle Level gelöst!</span>}
              </div>
              {cfg.lesson && <p className="mt-1.5 text-sm text-emerald-800 leading-snug">💡 {cfg.lesson}</p>}
            </div>
          ) : (
            <ul className="mt-2 space-y-1">
              {check.items.map((it, i) => (
                <li key={i} className={`text-sm flex items-start gap-1.5 ${it.ok ? "text-emerald-600" : "text-stone-500"}`}>
                  {it.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <Circle size={15} className="mt-0.5 shrink-0 text-stone-300" />}
                  <span>{it.t}</span>
                </li>
              ))}
            </ul>
          )
        )}

        {/* Werkzeuge */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {palette.map((t) => {
            const I = TOOLS[t].icon, active = tool === t;
            return (
              <button key={t} onClick={() => setTool(t)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition border ${active ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"}`}>
                <I size={16} />{TOOLS[t].label}
              </button>
            );
          })}
          {palette.some((t) => PLACEABLE.has(t) && t !== "cross") && (
            <button onClick={() => setOrient((o) => (o === "h" ? "v" : "h"))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white text-stone-700 border border-stone-200">
              <RotateCw size={16} />{orient === "h" ? "Quer ↔" : "Hoch ↕"}
            </button>
          )}
          <button onClick={resetGrid}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white text-stone-700 border border-stone-200">
            <RotateCcw size={16} />Zurücksetzen</button>
          {mode === "sandbox" && (
            <button onClick={clearGrid}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white text-stone-700 border border-stone-200">
              <Trash2 size={16} />Leeren</button>
          )}
        </div>

        <p className="mt-3 text-sm text-stone-500 leading-relaxed">
          {mode === "sandbox"
            ? "Baue frei: Bauteile platzieren, Leitungen ziehen und mit „Schalten“ Schalter umlegen, Widerstände ändern, LEDs drehen. Mehrere Quellen sind erlaubt."
            : cfg.hint}
        </p>
      </div>

      {/* Overlays */}
      {overlay && (
        <div className="fixed inset-0 z-20 bg-stone-900/40 flex items-end sm:items-center justify-center p-3"
          onClick={() => setOverlay(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[80vh] overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">{overlay === "levels" ? "Kapitel & Level" : "Schaltzeichen"}</h2>
              <button onClick={() => setOverlay(null)} className="p-1.5 rounded-lg bg-stone-100"><X size={16} /></button>
            </div>
            {overlay === "levels" ? (
              CHAPTERS.map((ch, ci) => (
                <div key={ci} className="mb-4">
                  <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">{ci + 1} · {ch.name}</div>
                  <div className="space-y-1">
                    {LEVELS.map((l, i) => l.ch !== ci ? null : (
                      <button key={i} onClick={() => goLevel(i)}
                        className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg flex items-center gap-2 ${i === levelIndex && mode === "level" ? "bg-stone-800 text-white" : "bg-stone-50 hover:bg-stone-100"}`}>
                        <span className={`w-5 text-xs ${i === levelIndex && mode === "level" ? "text-stone-300" : "text-stone-400"}`}>{i + 1}</span>
                        <span className="flex-1">{l.name}</span>
                        {completed.has(i) && <CheckCircle2 size={15} className="text-emerald-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LEGEND.map(([c, name, desc], i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-stone-50">
                    <svg viewBox="0 0 60 60" width={52} height={52} className="shrink-0" style={{ background: BG, borderRadius: 10 }}>
                      <line x1={0} y1={30} x2={60} y2={30} stroke={WIRE} strokeWidth={6} strokeLinecap="round" />
                      {cellGlyph("0,0", c, EMPTY_SIM)}
                    </svg>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{name}</div>
                      <div className="text-xs text-stone-500 leading-snug">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
