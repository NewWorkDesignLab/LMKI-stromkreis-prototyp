import { useEffect, useState } from "react";

/** Wird erst wahr, wenn `on` seit `ms` Millisekunden wahr ist; fällt sofort zurück. Für
    Einblendungen, die einem Ereignis mit kurzem Abstand folgen sollen, statt gleichzeitig. */
export function useSettled(on: boolean, ms: number): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!on) {
      setSettled(false);
      return;
    }
    const timer = window.setTimeout(() => setSettled(true), ms);
    return () => window.clearTimeout(timer);
  }, [on, ms]);
  return on && settled;
}
