/* eigene Werkzeug-Icons für Bauteile ohne passendes lucide-Symbol */
export const SvgIco = ({ children }: { children?: React.ReactNode }) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);
export const ResIcon = () => (
  <SvgIco>
    <path d="M1 12h4" />
    <rect x={5} y={8} width={14} height={8} rx={1} />
    <path d="M19 12h4" />
  </SvgIco>
);
/* Öffner: Hebel liegt am Ruhekontakt an – der Querstrich rechts. */
export const OpenerIcon = () => (
  <SvgIco>
    <path d="M2 12h4" />
    <path d="M18 12h4" />
    <path d="M6 12h11" />
    <path d="M18 8v8" />
  </SvgIco>
);
export const LedIcon = () => (
  <SvgIco>
    <path d="M12 2v5" />
    <path d="M6 7h12l-6 9z" />
    <path d="M6 18h12" />
    <path d="M12 18v4" />
  </SvgIco>
);
