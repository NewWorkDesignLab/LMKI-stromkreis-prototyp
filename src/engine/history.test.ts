import { describe, expect, it } from "vitest";
import { emptyHistory, record, redo, undo } from "./history";

describe("Verlauf", () => {
  it("nimmt Schritte zurück und wiederholt sie", () => {
    let h = record(emptyHistory<number>(), 1);
    h = record(h, 2);
    const u = undo(h, 3);
    expect(u.present).toBe(2);
    const r = redo(u.history, u.present);
    expect(r.present).toBe(3);
    expect(undo(emptyHistory<number>(), 1)).toBeNull();
  });

  it("verwirft das Wiederholbare bei einer neuen Änderung", () => {
    const u = undo(record(emptyHistory<number>(), 1), 2);
    expect(record(u.history, u.present).future).toEqual([]);
  });

  it("begrenzt die Länge", () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < 10; i++) h = record(h, i, 3);
    expect(h.past).toEqual([7, 8, 9]);
  });
});
