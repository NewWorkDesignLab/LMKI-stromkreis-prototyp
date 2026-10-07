import type { Runtime } from "../app/runtime";
import {
  API_VERSION,
  type ApiEvent,
  type Command,
  type CommandResult,
  type Snapshot,
  type StromkreisApi,
} from "./types";

export * from "./types";

const fail = (error: string, details?: string[]): CommandResult => ({ ok: false, error, details });

/* Baut die Schnittstelle über der Runtime. Sie ist die einzige Stelle, an der
   Fremdsteuerung auf die Anwendung trifft: Befehle werden hier geprüft und auf
   Dienste abgebildet, die Oberfläche reagiert nur auf den Zustand. */
export function createApi(rt: Runtime): StromkreisApi {
  const snapshot = (): Snapshot => {
    const s = rt.state.get();
    return {
      apiVersion: API_VERSION,
      mode: s.mode,
      currentLevelId: s.levelId,
      order: s.order,
      solved: s.solved,
      themeId: s.themeId,
      chapters: rt.content.getChapters(),
    };
  };

  function dispatch(c: Command): CommandResult {
    switch (c.type) {
      case "go_to_level":
        return rt.goToLevel(c.levelId) ? { ok: true } : fail(`Unbekanntes Level „${c.levelId}“`);
      case "go_to_sandbox":
        rt.goToSandbox();
        return { ok: true };
      case "set_level_order": {
        const r = rt.setOrder(c.levelIds);
        return r.ok
          ? { ok: true }
          : fail("Reihenfolge ungültig", r.unknown.length ? r.unknown : ["leere Liste"]);
      }
      case "set_chapters":
        rt.content.setChapters(c.chapters);
        return { ok: true };
      case "register_level": {
        const r = rt.content.registerLevel(c.level);
        return r.ok ? { ok: true } : fail("Level ungültig", r.errors);
      }
      case "patch_level":
        return rt.content.patchLevel(c.levelId, c.patch)
          ? { ok: true }
          : fail(`Unbekanntes Level „${c.levelId}“`);
      case "register_theme":
        rt.registerTheme(c.theme);
        return { ok: true };
      case "set_theme":
        return rt.setTheme(c.themeId) ? { ok: true } : fail(`Unbekanntes Thema „${c.themeId}“`);
      default:
        return fail("Unbekannter Befehl");
    }
  }

  return {
    version: API_VERSION,
    getSnapshot: snapshot,
    listLevels() {
      const { order, solved } = rt.state.get();
      return rt.content.listLevels().map((l) => ({
        id: l.id,
        name: l.name,
        chapterId: l.chapterId,
        concepts: l.concepts ?? [],
        solved: solved.includes(l.id),
        inOrder: order.includes(l.id),
      }));
    },
    getLevel: (id) => rt.content.getLevel(id),
    getLevelStats: (id) => rt.progress.stats(id),
    getProfile: () => rt.assessment.profile(),
    getEvents: () => rt.progress.events(),
    listThemes: () => rt.listThemes(),
    dispatch,
    subscribe(listener: (e: ApiEvent) => void) {
      const offs = [
        rt.events.on(listener),
        rt.state.subscribe(() => listener({ type: "state_changed", snapshot: snapshot() })),
        rt.content.subscribe(() => listener({ type: "content_changed" })),
      ];
      return () => offs.forEach((off) => off());
    },
  };
}

declare global {
  interface Window {
    /** Fremdsteuerung der laufenden Anwendung, siehe src/api/types.ts */
    stromkreis?: StromkreisApi;
  }
}
