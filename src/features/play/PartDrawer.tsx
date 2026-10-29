import { useState, type ComponentProps } from "react";
import { PartPalette } from "./PartPalette";

/* Der Griff ist ein Dreieck, das in die Richtung zeigt, in die das Fach aufgeht. */
function Triangle({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 10 10" width={10} height={10} aria-hidden="true" className={className}>
      <path d="M8 1 2 5l6 4Z" fill="currentColor" />
    </svg>
  );
}

/* Das aufklappbare Bauteilfach am Brett. Ab xl sitzt es links neben dem Brettrahmen: ein
   schmaler, hoher Griff, aus dem das Fach nach links aufgeht – dort ist neben dem Brett immer
   Platz, das Brett selbst bleibt, wo es ist. Darunter steht das Fach als Leiste über dem Brett
   und geht nach unten auf. Es startet offen: Wer ein Level mit Bauteilen öffnet, soll sie sehen,
   ohne erst suchen zu müssen. Der Elternknoten muss `relative` sein und die Höhe des Bretts haben. */
export function PartDrawer(props: ComponentProps<typeof PartPalette>) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm xl:absolute xl:bottom-0 xl:right-full xl:top-0 xl:mr-2 xl:flex-row-reverse">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="bauteilfach"
        aria-label={open ? "Bauteile einklappen" : "Bauteile ausklappen"}
        className="flex h-11 items-center justify-center gap-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 xl:h-auto xl:w-11 xl:flex-col xl:py-3"
      >
        <Triangle
          className={`transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-90 xl:rotate-180" : "-rotate-90 xl:rotate-0"}`}
        />
        <span className="xl:[writing-mode:vertical-rl]">Bauteile</span>
      </button>
      <div
        id="bauteilfach"
        className={`min-h-0 overflow-hidden transition-all duration-300 motion-reduce:transition-none xl:max-h-none ${open ? "max-h-[60rem] xl:w-60" : "invisible max-h-0 xl:w-0"}`}
      >
        <div className="max-h-[60rem] overflow-y-auto border-t border-stone-200 p-3 xl:h-full xl:max-h-none xl:w-60 xl:border-r xl:border-t-0">
          <PartPalette {...props} />
        </div>
      </div>
    </div>
  );
}
