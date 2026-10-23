import { useRuntime, useRuntimeState } from "../../app/RuntimeContext";
import { PANEL_HEADING } from "../../ui/heading";
import { Toggle } from "../../ui/Toggle";

/* Inhalt des Einstellungsdialogs. Die Werte prüft und speichert die Runtime
   (services/settings.ts); hier wird nur angezeigt und weitergereicht. */
export function SettingsPanel() {
  const rt = useRuntime();
  const { settings } = useRuntimeState();
  return (
    <div className="space-y-5">
      <section>
        <h3 className={PANEL_HEADING}>Erleichterungen</h3>
        <Toggle
          label="Ziehhilfe"
          description="Ziehst du eine Leitung an einem Bauteilanschluss entlang, wird sie sofort angeschlossen – du musst nicht erst übers Bauteil fahren."
          checked={settings.snapWires}
          onChange={(snapWires) => rt.setSettings({ snapWires })}
        />
      </section>
      <section>
        <h3 className={PANEL_HEADING}>Darstellung</h3>
        <Toggle
          label="Flussanimation"
          description="Laufende Striche zeigen die Stromrichtung in stromführenden Leitungen."
          checked={settings.flowAnimation}
          onChange={(flowAnimation) => rt.setSettings({ flowAnimation })}
        />
      </section>
      <section>
        <h3 className={PANEL_HEADING}>Ton</h3>
        <Toggle
          label="Töne"
          description="Kurze Rückmeldetöne beim Bauen und Lösen. Die Töne selbst folgen in einer der nächsten Versionen."
          checked={settings.sound}
          onChange={(sound) => rt.setSettings({ sound })}
        />
        <label className="mt-1 flex min-h-11 items-center gap-3 px-2 text-sm">
          <span className="w-24 font-medium text-stone-800">Lautstärke</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(settings.volume * 100)}
            disabled={!settings.sound}
            onChange={(e) => rt.setSettings({ volume: Number(e.target.value) / 100 })}
            className="flex-1 accent-teal-600 disabled:opacity-40"
          />
          <span className="w-10 text-right tabular-nums text-stone-500">
            {Math.round(settings.volume * 100)} %
          </span>
        </label>
      </section>
    </div>
  );
}
