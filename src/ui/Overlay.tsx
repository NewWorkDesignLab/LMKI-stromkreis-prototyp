import { X } from "lucide-react";
import type { ReactNode } from "react";

/* Blatt am unteren Rand (Handy) bzw. in der Mitte (breite Fenster). */
export function Overlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-20 bg-stone-900/40 flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xl max-h-[80vh] overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="p-1.5 rounded-lg bg-stone-100"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
