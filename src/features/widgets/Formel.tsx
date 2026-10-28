import { Fragment } from "react";
import { FORMELZEICHEN } from "../../render/formelzeichen";

/* Formelsatz wie an der Tafel: Formelzeichen kursiv und mit tiefgestelltem
   Index, Zahlen und Einheiten aufrecht. Geschrieben wird einfach "R_ges".
   Alles andere im Text bleibt, wie es ist. */
export function Formel({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {String(children)
        .split(/(\s+)/)
        .map((token, n) => {
          const m = FORMELZEICHEN.exec(token);
          if (!m) return token;
          return (
            <Fragment key={n}>
              <i className="font-serif">{m[1]}</i>
              {m[2] && <sub className="font-serif text-[0.75em]">{m[2]}</sub>}
              {m[3]}
            </Fragment>
          );
        })}
    </>
  );
}
