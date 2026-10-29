import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Runtime, RuntimeState } from "./runtime";

const Ctx = createContext<Runtime | null>(null);

export function RuntimeProvider({ runtime, children }: { runtime: Runtime; children: ReactNode }) {
  return <Ctx.Provider value={runtime}>{children}</Ctx.Provider>;
}

export function useRuntime(): Runtime {
  const rt = useContext(Ctx);
  if (!rt) throw new Error("RuntimeProvider fehlt");
  return rt;
}

/** Sitzungszustand; rendert neu, sobald er sich ändert. */
export function useRuntimeState(): RuntimeState {
  const rt = useRuntime();
  return useSyncExternalStore(rt.state.subscribe, rt.state.get);
}

/** Abonniert den Inhalt (Level, Kapitel); rendert neu, wenn er sich ändert. */
export function useContentVersion(): number {
  const rt = useRuntime();
  return useSyncExternalStore(rt.content.subscribe, rt.content.getVersion);
}
