import { describe, expect, it } from "vitest";
import type { Circuit } from "../domain/types";
import { wires } from "../content/helpers";
import { wireKey } from "./circuit";
import {
  activate,
  canConnect,
  carryOperatingState,
  connect,
  disconnect,
  erasePoint,
  place,
  release,
  remaining,
  removePart,
  setValue,
  snapToTerminals,
  type EditContext,
} from "./editing";

const level: EditContext = { board: { W: 5, H: 3, walls: ["2,1"] }, mode: "level" };
const sandbox: EditContext = { ...level, mode: "sandbox" };

const loop = (): Circuit => ({
  parts: {
    G1: { type: "battery", x: 0, y: 1, orient: "v" },
    E1: { type: "lamp", x: 4, y: 1, orient: "v" },
  },
  wires: wires(["0,1 0,0 4,0 4,1"], { lock: true }),
});

describe("Leitungen", () => {
  it("verbindet nur benachbarte, freie Punkte mit passenden Anschlüssen", () => {
    const c = loop();
    expect(canConnect(c, level, "0,2", "1,2")).toBe(true);
    expect(canConnect(c, level, "0,2", "2,2")).toBe(false); // keine Nachbarn
    expect(canConnect(c, level, "1,1", "2,1")).toBe(false); // Wand
    expect(canConnect(c, level, "4,2", "5,2")).toBe(false); // außerhalb
    expect(canConnect(c, level, "1,1", "0,1")).toBe(false); // Quelle hat seitlich keinen Anschluss
    expect(canConnect(c, level, "0,0", "1,0")).toBe(false); // liegt schon
  });

  it("lässt eine abgelehnte Änderung unverändert (gleiches Objekt)", () => {
    const c = loop();
    expect(connect(c, level, "1,1", "0,1")).toBe(c);
    expect(disconnect(c, level, wireKey("1,0", "2,0"))).toBe(c); // fest verlegt
  });

  it("schützt fest verlegte Leitungen nur im Level", () => {
    const c = loop();
    const k = wireKey("1,0", "2,0");
    expect(disconnect(c, sandbox, k).wires[k]).toBeUndefined();
  });
});

describe("Bauteile", () => {
  it("setzt ein Bauteil in eine Leitung ein, wenn die Ausrichtung passt", () => {
    const c = { ...loop(), wires: wires(["0,0 4,0"]) };
    expect(place(c, level, "2,0", "lamp", "v").circuit).toBe(c);
    const r = place(c, level, "2,0", "lamp", "h");
    expect(r.id).toBe("E2");
    expect(r.circuit.parts.E2).toMatchObject({ type: "lamp", x: 2, y: 0, user: true });
  });

  it("nimmt beim Entfernen die angeschlossenen Leitungen mit, damit keine Brücke entsteht", () => {
    let c: Circuit = { parts: {}, wires: {} };
    c = place(c, sandbox, "2,0", "lamp", "h").circuit;
    c = connect(connect(c, sandbox, "1,0", "2,0"), sandbox, "2,0", "3,0");
    const removed = removePart(c, sandbox, "E1");
    expect(removed.parts.E1).toBeUndefined();
    expect(Object.keys(removed.wires)).toEqual([]);
  });

  it("schützt vorgegebene Bauteile im Level, im Frei bauen nicht", () => {
    const c = loop();
    expect(erasePoint(c, level, "0,1")).toBe(c);
    expect(erasePoint(c, sandbox, "0,1").parts.G1).toBeUndefined();
  });

  it("löscht an einem Leitungsknoten nur die eigenen Leitungen", () => {
    const c = { ...loop(), wires: { ...loop().wires, ...wires(["1,0 1,1"]) } };
    const n = erasePoint(c, level, "1,0");
    expect(n.wires[wireKey("1,0", "1,1")]).toBeUndefined();
    expect(n.wires[wireKey("0,0", "1,0")]).toBeDefined();
    expect(n.wires[wireKey("1,0", "2,0")]).toBeDefined();
  });
});

describe("Materialvorrat", () => {
  const stocked: EditContext = { ...level, stock: { lamp: 1, opener: 1 } };

  it("lässt nur so viele Teile setzen, wie der Vorrat hergibt", () => {
    const one = place(loop(), stocked, "1,2", "lamp", "h").circuit;
    expect(remaining(one, stocked, "lamp")).toBe(0);
    const two = place(one, stocked, "3,2", "lamp", "h");
    expect(two.circuit).toBe(one);
  });

  it("zählt vorgegebene Teile nicht mit und gibt gelöschte zurück", () => {
    expect(remaining(loop(), stocked, "lamp")).toBe(1); // E1 ist vorgegeben
    const r = place(loop(), stocked, "1,2", "lamp", "h");
    expect(remaining(removePart(r.circuit, stocked, r.id), stocked, "lamp")).toBe(1);
  });

  it("unterscheidet Öffner und Schalter, obwohl beide Schalter sind", () => {
    const c = place(loop(), stocked, "1,2", "opener", "h").circuit;
    expect(remaining(c, stocked, "opener")).toBe(0);
    expect(remaining(c, stocked, "switch")).toBeNull();
  });

  it("begrenzt nichts ohne Vorrat und nichts im freien Bauen", () => {
    expect(remaining(loop(), level, "lamp")).toBeNull();
    expect(remaining(loop(), { ...stocked, mode: "sandbox" }, "lamp")).toBeNull();
  });
});

describe("Antippen", () => {
  it("schaltet Schalter und lässt Taster zurückfedern", () => {
    const sw: Circuit = {
      parts: { S1: { type: "switch", x: 0, y: 0, orient: "h", closed: false } },
      wires: {},
    };
    const t = activate(sw, level, "S1");
    expect(t.kind).toBe("operate");
    expect(t.circuit.parts.S1.closed).toBe(true);

    const btn: Circuit = {
      parts: { S1: { type: "button", x: 0, y: 0, orient: "h", closed: false } },
      wires: {},
    };
    const pressed = activate(btn, level, "S1");
    expect(pressed.circuit.parts.S1.closed).toBe(true);
    expect(pressed.pressed).toBe("S1");
    expect(release(pressed.circuit, "S1").parts.S1.closed).toBe(false);
  });

  it("dreht eigene Bauteile und löst dabei Leitungen, die ins Leere liefen", () => {
    let c: Circuit = { parts: {}, wires: {} };
    c = place(c, sandbox, "1,1", "lamp", "h").circuit;
    c = connect(c, sandbox, "0,1", "1,1");
    const r = activate(c, sandbox, "E1");
    expect(r.kind).toBe("edit");
    expect(r.circuit.parts.E1.orient).toBe("v");
    expect(r.circuit.wires).toEqual({});
  });

  it("dreht nicht, wenn dabei eine fest verlegte Leitung gelöst würde", () => {
    const c: Circuit = {
      parts: { E1: { type: "lamp", x: 1, y: 1, orient: "h", user: true } },
      wires: wires(["0,1 1,1"], { lock: true }),
    };
    expect(activate(c, level, "E1").circuit).toBe(c);
  });
});

describe("Freier Widerstandswert", () => {
  const free = (): Circuit => ({
    parts: {
      R1: { type: "resistor", x: 1, y: 0, orient: "h", r: 100, range: { min: 1, max: 10000 } },
    },
    wires: {},
  });

  it("lässt beim Antippen den Wert abfragen, statt ihn weiterzuschalten", () => {
    const c = free();
    expect(activate(c, level, "R1")).toEqual({ circuit: c, kind: "value" });
  });

  it("übernimmt einen Wert innerhalb der Grenzen", () => {
    expect(setValue(free(), "R1", 270).parts.R1.r).toBe(270);
  });

  it("lehnt Werte außerhalb der Grenzen, Nicht-Zahlen und den gleichen Wert ab", () => {
    const c = free();
    expect(setValue(c, "R1", 0.5)).toBe(c);
    expect(setValue(c, "R1", 20000)).toBe(c);
    expect(setValue(c, "R1", NaN)).toBe(c);
    expect(setValue(c, "R1", 100)).toBe(c);
  });

  it("lässt Widerstände ohne Bereich nicht frei einstellen", () => {
    const c: Circuit = { parts: { R1: { type: "resistor", x: 1, y: 0, orient: "h" } }, wires: {} };
    expect(setValue(c, "R1", 270)).toBe(c);
  });
});

describe("Bedienzustand", () => {
  it("wird beim Zurückspringen übernommen, der Aufbau nicht", () => {
    const before = loop();
    before.parts.S1 = { type: "switch", x: 2, y: 0, orient: "h", closed: false };
    const now = {
      ...before,
      parts: { ...before.parts, S1: { ...before.parts.S1, closed: true } },
      wires: {},
    };
    const back = carryOperatingState(before, now);
    expect(back.parts.S1.closed).toBe(true);
    expect(back.wires).toEqual(before.wires);
  });
});

describe("Ziehhilfe", () => {
  const board: EditContext = { board: { W: 5, H: 5 }, mode: "level" };
  const lamp = (x: number, y: number, orient: "h" | "v") =>
    ({ type: "lamp", x, y, orient, user: true }) as const;

  it("verbindet einen Punkt mit dem Anschluss, der darauf zeigt", () => {
    const c: Circuit = { parts: { E1: lamp(2, 1, "v") }, wires: wires(["0,2 2,2"]) };
    expect(snapToTerminals(c, board, "2,2").wires[wireKey("2,1", "2,2")]).toEqual({});
  });

  it("schließt auch eine Leitung an, die nur vorbeiläuft", () => {
    const c: Circuit = { parts: { E1: lamp(2, 1, "v") }, wires: wires(["0,2 4,2"]) };
    expect(snapToTerminals(c, board, "2,2").wires[wireKey("2,1", "2,2")]).toEqual({});
  });

  it("verbindet alle Anschlüsse, die auf den Punkt zeigen", () => {
    const c: Circuit = {
      parts: { E1: lamp(2, 1, "v"), E2: lamp(2, 3, "v") },
      wires: wires(["0,2 2,2"]),
    };
    const n = snapToTerminals(c, board, "2,2");
    expect(n.wires[wireKey("2,1", "2,2")]).toEqual({});
    expect(n.wires[wireKey("2,2", "2,3")]).toEqual({});
  });

  it("verbindet nichts, wenn kein Anschluss auf den Punkt zeigt", () => {
    const c: Circuit = { parts: { E1: lamp(2, 1, "h") }, wires: wires(["0,2 2,2"]) };
    expect(snapToTerminals(c, board, "2,2")).toBe(c);
  });

  it("verbindet keine Leitungen miteinander, die nur nebeneinander liegen", () => {
    const c: Circuit = { parts: {}, wires: wires(["0,1 4,1", "0,2 4,2"]) };
    expect(snapToTerminals(c, board, "2,2")).toBe(c);
  });
});
