/* Minimaler beobachtbarer Zustand. Passt zu useSyncExternalStore
   (subscribe + get) und ist ohne React nutzbar – die API arbeitet auf demselben Store. */
export interface Store<S> {
  get(): S;
  set(patch: Partial<S> | ((s: S) => Partial<S>)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<S extends object>(initial: S): Store<S> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === "function" ? patch(state) : patch;
      const changed = (Object.keys(p) as (keyof S)[]).some((k) => p[k] !== state[k]);
      if (!changed) return;
      state = { ...state, ...p };
      for (const l of [...listeners]) l();
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
