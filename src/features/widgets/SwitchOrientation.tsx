import { useRef } from "react";
import { X } from "lucide-react";

export function SwitchOrientation() {
  const dialogRef = useRef(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Lichtschalter aus dem Alltag ansehen"
        aria-haspopup="dialog"
        title="Ein Blick in den Alltag"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 bg-white text-sm font-semibold text-stone-500 hover:bg-amber-50 hover:text-stone-800 transition-colors"
      >
        ?
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="switch-orientation-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current.close();
        }}
        className="rounded-2xl p-0 shadow-xl"
        style={{ width: "min(420px, calc(100vw - 32px))", maxHeight: "85vh" }}
      >
        <div className="p-5 text-left normal-case tracking-normal">
          <div className="flex items-center justify-between gap-3">
            <h2 id="switch-orientation-title" className="text-base font-semibold text-stone-800">
              Kennst du diesen Schalter?
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current.close()}
              aria-label="Abbildung schließen"
              autoFocus
              className="rounded-lg bg-stone-100 p-2 text-stone-600"
            >
              <X size={18} />
            </button>
          </div>
          <figure className="mt-4">
            <svg
              viewBox="0 0 360 280"
              className="w-full rounded-xl"
              role="img"
              aria-label="Weißer Wipp-Lichtschalter an einer dunklen Wand. Im unteren Teil der Wippe glimmt ein kleines orangefarbenes Fenster."
            >
              <defs>
                <linearGradient id="orientation-wall" x2="1" y2="1">
                  <stop stopColor="#44403c" />
                  <stop offset="1" stopColor="#292524" />
                </linearGradient>
                <linearGradient id="orientation-frame" x2="0.8" y2="1">
                  <stop stopColor="#fafaf9" />
                  <stop offset="1" stopColor="#d6d3d1" />
                </linearGradient>
                <linearGradient id="orientation-rocker" x2="0.2" y2="1">
                  <stop stopColor="#e7e5e4" />
                  <stop offset="0.85" stopColor="#fafaf9" />
                  <stop offset="1" stopColor="#d6d3d1" />
                </linearGradient>
                <radialGradient id="orientation-glow">
                  <stop stopColor="#fb923c" stopOpacity="0.5" />
                  <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path fill="url(#orientation-wall)" d="M0 0H360V280H0Z" />
              <rect x="94" y="47" width="184" height="198" rx="18" fill="#0c0a09" opacity="0.3" />
              <rect
                x="86"
                y="37"
                width="188"
                height="198"
                rx="16"
                fill="url(#orientation-frame)"
                stroke="#a8a29e"
              />
              <rect x="105" y="56" width="150" height="160" rx="9" fill="#78716c" />
              <rect
                x="109"
                y="59"
                width="142"
                height="152"
                rx="7"
                fill="url(#orientation-rocker)"
                stroke="#a8a29e"
              />
              <path d="M117 64H242" stroke="white" strokeOpacity="0.7" />
              <ellipse cx="180" cy="179" rx="53" ry="28" fill="url(#orientation-glow)" />
              <rect x="158" y="171" width="44" height="14" rx="4" fill="#78716c" />
              <rect x="161" y="174" width="38" height="8" rx="2" fill="#ea580c" />
              <rect x="165" y="176" width="30" height="4" rx="2" fill="#fdba74" />
            </svg>
            <figcaption className="mt-3 text-sm font-normal leading-relaxed text-stone-600">
              Ein kleines Glimmlicht hilft dir, den Schalter im Dunkeln zu finden – auch wenn das
              Raumlicht ausgeschaltet ist.
            </figcaption>
          </figure>
        </div>
      </dialog>
    </>
  );
}
