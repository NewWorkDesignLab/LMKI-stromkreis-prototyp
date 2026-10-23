import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  LayoutGrid,
  Settings,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { SANDBOX } from "../content/sandbox";
import { LessonView } from "../features/lesson/LessonView";
import { PlayArea } from "../features/play/PlayArea";
import { SettingsPanel } from "../features/settings/SettingsPanel";
import { applyTheme, DEFAULT_THEME } from "../theme/themes";
import { LegendOverlay } from "../ui/LegendOverlay";
import { LevelPicker } from "../ui/LevelPicker";
import { Overlay } from "../ui/Overlay";
import { useContentVersion, useRuntime, useRuntimeState } from "./RuntimeContext";

type OverlayKind = "levels" | "legend" | "settings" | null;

const ICON_BUTTON =
  "flex h-11 w-11 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900";

export default function App() {
  const rt = useRuntime();
  const s = useRuntimeState();
  useContentVersion();
  const [overlay, setOverlay] = useState<OverlayKind>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  /* Thema: Farbtokens als CSS-Variablen am Wurzelelement */
  useEffect(() => {
    if (rootRef.current) applyTheme(rootRef.current, rt.getTheme(s.themeId) ?? DEFAULT_THEME);
  }, [rt, s.themeId, s.themeRevision]);

  const mode = s.mode;
  const level = rt.content.getLevel(s.levelId)!;
  const { chapter } = rt.content.chapterOf(s.levelId);
  const solved = new Set(s.solved);
  const position = s.order.indexOf(s.levelId);
  const prevId = rt.neighbourLevelId(-1);
  const nextNavId = rt.neighbourLevelId(1);
  const nextId = rt.nextLevelId();

  const goLevel = (id: string) => {
    rt.goToLevel(id);
    setOverlay(null);
  };

  const entries = s.order.map((id) => {
    const l = rt.content.getLevel(id)!;
    return {
      id,
      name: l.name,
      chapter: rt.content.chapterOf(id).chapter,
      chapterIndex: rt.content.chapterOf(id).index,
    };
  });

  const modeTab = (active: boolean) =>
    `min-h-10 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition ${active ? "bg-white shadow text-stone-900" : "text-stone-500 hover:text-stone-800"}`;

  /* Ganze Fensterhöhe ab lg: Kopfleiste oben, darunter füllt der Schritt den Rest, und
     nur die Seitenspalten scrollen. Darunter (schmale Fenster) fließt die Seite normal. */
  return (
    <div
      ref={rootRef}
      className="flex min-h-screen w-full flex-col bg-stone-100 font-sans text-stone-800 lg:h-screen"
    >
      {/* Ab lg drei Spalten mit gleich breiten Außenspalten: die Levelnavigation steht
          genau in der Mitte, und ihre Pfeile springen nicht, wenn Titel oder Kapitel länger
          oder kürzer werden – man kann sie durchklicken, ohne nachzuzielen. Zwischen lg und
          xl reicht die linke Spalte dafür nur ohne den Schriftzug neben dem Blitz. */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-stone-200 bg-white px-4 py-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="text-amber-500" size={24} aria-hidden="true" />
            <h1 className="text-lg font-bold tracking-tight lg:max-xl:sr-only">Stromkreis</h1>
          </div>

          <div className="flex gap-1 rounded-xl bg-stone-200 p-1" role="group" aria-label="Modus">
            <button
              type="button"
              onClick={() => mode !== "level" && goLevel(s.levelId)}
              aria-pressed={mode === "level"}
              className={modeTab(mode === "level")}
            >
              Level
            </button>
            <button
              type="button"
              onClick={() => rt.goToSandbox()}
              aria-pressed={mode === "sandbox"}
              className={modeTab(mode === "sandbox")}
            >
              Frei bauen
            </button>
          </div>
        </div>

        {mode === "level" ? (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => prevId && goLevel(prevId)}
              disabled={!prevId}
              aria-label="Vorheriges Level"
              className={`${ICON_BUTTON} disabled:opacity-35`}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setOverlay("levels")}
              title={`${chapter.name} · ${level.name}`}
              /* feste Breite für den längsten Titel; noch längere werden gekürzt statt die
                 Pfeile zu verschieben */
              className="w-[21rem] min-w-0 max-w-[60vw] rounded-lg px-3 py-1 text-center hover:bg-stone-100"
            >
              <span className="flex items-center justify-center gap-1 text-xs text-stone-500">
                <LayoutGrid size={11} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{chapter.name}</span>
                <span className="shrink-0">
                  · {position + 1}/{s.order.length}
                </span>
              </span>
              <span className="flex items-center justify-center gap-1 font-semibold">
                <span className="truncate">{level.name}</span>
                {solved.has(level.id) && (
                  <CheckCircle2
                    size={16}
                    className="shrink-0 text-emerald-500"
                    aria-label="gelöst"
                  />
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => nextNavId && goLevel(nextNavId)}
              disabled={!nextNavId}
              aria-label="Nächstes Level"
              className={`${ICON_BUTTON} disabled:opacity-35`}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div aria-hidden="true" className="hidden lg:block" />
        )}

        <div className="ml-auto flex items-center justify-end gap-1">
          <span className="mr-2 text-xs text-stone-500">
            {s.order.filter((id) => solved.has(id)).length}/{s.order.length} gelöst
          </span>
          <button
            type="button"
            onClick={() => rt.setSettings({ sound: !s.settings.sound })}
            aria-pressed={s.settings.sound}
            aria-label="Töne"
            title={s.settings.sound ? "Töne aus" : "Töne an"}
            className={ICON_BUTTON}
          >
            {s.settings.sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button
            type="button"
            onClick={() => setOverlay("legend")}
            aria-label="Schaltzeichen"
            title="Schaltzeichen"
            className={ICON_BUTTON}
          >
            <BookOpen size={19} />
          </button>
          <button
            type="button"
            onClick={() => setOverlay("settings")}
            aria-label="Einstellungen"
            title="Einstellungen"
            className={ICON_BUTTON}
          >
            <Settings size={19} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-3 lg:min-h-0 lg:p-4">
        {/* Neu eingehängt je Level und je ersetztem Level: so überlebt kein Zustand des alten */}
        {mode === "sandbox" ? (
          <PlayArea key="sandbox" step={SANDBOX} mode="sandbox" overlayOpen={overlay !== null} />
        ) : (
          <LessonView
            key={`${level.id}:${rt.content.boardRevision(level.id)}`}
            level={level}
            overlayOpen={overlay !== null}
            hasNextLevel={nextId !== null}
            onNextLevel={() => nextId && goLevel(nextId)}
          />
        )}
      </main>

      {overlay === "levels" && (
        <Overlay title="Kapitel & Level" onClose={() => setOverlay(null)}>
          <LevelPicker
            entries={entries}
            currentId={mode === "level" ? s.levelId : null}
            solved={solved}
            onPick={goLevel}
          />
        </Overlay>
      )}
      {overlay === "legend" && (
        <Overlay title="Schaltzeichen" onClose={() => setOverlay(null)}>
          <LegendOverlay />
        </Overlay>
      )}
      {overlay === "settings" && (
        <Overlay title="Einstellungen" onClose={() => setOverlay(null)}>
          <SettingsPanel />
        </Overlay>
      )}
    </div>
  );
}
