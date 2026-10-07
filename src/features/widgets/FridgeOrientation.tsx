import { useRef, useState } from "react";
import { X } from "lucide-react";

export function FridgeOrientation() {
  const dialogRef = useRef(null);
  const [doorOpen, setDoorOpen] = useState(true);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDoorOpen(true);
          dialogRef.current?.showModal();
        }}
        aria-label="Öffner im Alltag: Kühlschrank ansehen"
        aria-haspopup="dialog"
        title="Ein Blick in den Alltag"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 bg-white text-sm font-semibold text-stone-500 hover:bg-amber-50 hover:text-stone-800"
      >
        ?
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="fridge-orientation-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current.close();
        }}
        className="rounded-2xl p-0 shadow-xl"
        style={{ width: "min(420px, calc(100vw - 32px))", maxHeight: "85vh" }}
      >
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="fridge-orientation-title" className="text-base font-semibold text-stone-800">
              Ein Öffner im Kühlschrank
            </h2>
            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current.close()}
              aria-label="Abbildung schließen"
              className="rounded-lg bg-stone-100 p-2 text-stone-600"
            >
              <X size={18} />
            </button>
          </div>
          <svg
            viewBox="0 0 360 280"
            className="mt-4 w-full rounded-xl"
            role="img"
            aria-label={
              doorOpen
                ? "Offener Kühlschrank mit leuchtender Innenlampe. Der Türtaster ist losgelassen."
                : "Geschlossener Kühlschrank. Der Türtaster ist gedrückt, die Innenlampe ist aus."
            }
          >
            <rect width="360" height="280" fill="#e7e5e4" />
            <path d="M0 247H360" stroke="#d6d3d1" />
            <ellipse cx="181" cy="250" rx="97" ry="10" fill="#a8a29e" opacity="0.3" />
            <rect
              x="98"
              y="25"
              width="144"
              height="219"
              rx="12"
              fill="#fafaf9"
              stroke="#a8a29e"
              strokeWidth="2"
            />
            <rect
              x="109"
              y="37"
              width="122"
              height="195"
              rx="5"
              fill={doorOpen ? "#fef3c7" : "#44403c"}
            />
            {doorOpen && <ellipse cx="170" cy="88" rx="52" ry="44" fill="#fde68a" opacity="0.6" />}
            <rect
              x="155"
              y="44"
              width="31"
              height="9"
              rx="4"
              fill={doorOpen ? "#fbbf24" : "#78716c"}
            />
            <path d="M112 107H228 M112 158H228 M112 209H228" stroke="#a8a29e" strokeWidth="3" />
            <rect x="124" y="76" width="22" height="29" rx="4" fill="#d6d3d1" />
            <path d="M126 76V68H144V76" fill="#fafaf9" stroke="#a8a29e" />
            <rect x="185" y="122" width="22" height="34" rx="5" fill="#a3b18a" />
            <rect x="190" y="115" width="12" height="9" rx="2" fill="#78716c" />
            <rect x="123" y="177" width="88" height="29" rx="5" fill="#e7e5e4" stroke="#a8a29e" />
            {doorOpen ? (
              <g>
                <path
                  d="M239 30L302 55V256L239 241Z"
                  fill="#fafaf9"
                  stroke="#a8a29e"
                  strokeWidth="2"
                />
                <path
                  d="M250 65L289 80V128L250 117Z M250 154L289 165V215L250 204Z"
                  fill="#e7e5e4"
                  stroke="#d6d3d1"
                />
                <rect x="222" y="66" width="13" height="9" rx="3" fill="#57534e" />
                <path d="M230 70L261 20H317" fill="none" stroke="#78716c" />
                <text x="263" y="15" fontSize="11" fill="#57534e">
                  Türtaster
                </text>
              </g>
            ) : (
              <g>
                <rect
                  x="101"
                  y="28"
                  width="138"
                  height="212"
                  rx="9"
                  fill="#f5f5f4"
                  stroke="#a8a29e"
                />
                <path d="M103 86H237" stroke="#d6d3d1" strokeWidth="2" />
                <rect x="116" y="105" width="7" height="49" rx="3" fill="#a8a29e" />
              </g>
            )}
          </svg>
          <div className="mt-3 rounded-lg bg-stone-50 p-3" aria-live="polite">
            <p className="text-sm font-semibold text-stone-800">
              {doorOpen ? "Tür offen - Licht an" : "Tür zu - Licht aus"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              {doorOpen
                ? "Die Tür gibt den Taster frei. Der Öffnerkontakt ist geschlossen: Der Strom kann zur Lampe fließen."
                : "Die Tür drückt den Taster hinein. Der Öffnerkontakt öffnet und unterbricht den Strom zur Lampe."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDoorOpen((open) => !open)}
            className="mt-3 w-full rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white"
          >
            {doorOpen ? "Tür schließen" : "Tür öffnen"}
          </button>
        </div>
      </dialog>
    </>
  );
}
