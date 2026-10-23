/* Ein/Aus-Schalter mit Beschriftung und Erklärung. Die ganze Zeile ist die Tastfläche. */
export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-stone-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-stone-800">{label}</span>
        {description && (
          <span className="block text-xs leading-snug text-stone-500">{description}</span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-teal-600" : "bg-stone-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[1.375rem]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
