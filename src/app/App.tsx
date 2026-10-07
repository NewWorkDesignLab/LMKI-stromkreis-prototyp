import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, LayoutGrid, Zap } from "lucide-react";
import { SANDBOX } from "../content/sandbox";
import { PlayArea } from "../features/play/PlayArea";
import { applyTheme, DEFAULT_THEME } from "../theme/themes";
import { LegendOverlay } from "../ui/LegendOverlay";
import { LevelPicker } from "../ui/LevelPicker";
import { Overlay } from "../ui/Overlay";
import { useContentVersion, useRuntime, useRuntimeState } from "./RuntimeContext";

type OverlayKind = "levels" | "legend" | null;

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
  const level = mode === "sandbox" ? SANDBOX : rt.content.getLevel(s.levelId)!;
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
    `flex-1 py-1.5 rounded-lg font-medium transition ${active ? "bg-white shadow text-stone-900" : "text-stone-500"}`;

  return (
    <div
      ref={rootRef}
      className="w-full min-h-screen bg-stone-50 text-stone-800 p-3 sm:p-5 flex flex-col items-center font-sans"
    >
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="text-amber-500" size={26} />
          <h1 className="text-xl font-bold tracking-tight">Stromkreis</h1>
          <span className="ml-auto text-xs text-stone-400">
            {s.order.filter((id) => solved.has(id)).length}/{s.order.length} gelöst
          </span>
          <button
            onClick={() => setOverlay("legend")}
            title="Symbole"
            aria-label="Symbole"
            className="p-1.5 rounded-lg bg-stone-200 text-stone-600"
          >
            <BookOpen size={16} />
          </button>
        </div>

        <div className="flex gap-1 mb-3 bg-stone-200 p-1 rounded-xl text-sm">
          <button
            onClick={() => mode !== "level" && goLevel(s.levelId)}
            className={modeTab(mode === "level")}
          >
            Level
          </button>
          <button onClick={() => rt.goToSandbox()} className={modeTab(mode === "sandbox")}>
            Frei bauen
          </button>
        </div>

        {mode === "level" && (
          <div className="flex items-center justify-between mb-2 gap-2">
            <button
              onClick={() => prevId && goLevel(prevId)}
              disabled={!prevId}
              aria-label="Vorheriges Level"
              className="p-2 rounded-lg bg-stone-200 disabled:opacity-40"
            >
              <ArrowLeft size={18} />
            </button>
            <button onClick={() => setOverlay("levels")} className="flex-1 text-center">
              <div className="text-xs text-stone-500 flex items-center justify-center gap-1">
                <LayoutGrid size={11} />
                {chapter.name} · {position + 1}/{s.order.length}
              </div>
              <div className="font-semibold flex items-center gap-1 justify-center">
                {level.name}
                {solved.has(level.id) && <CheckCircle2 size={16} className="text-emerald-500" />}
              </div>
            </button>
            <button
              onClick={() => nextNavId && goLevel(nextNavId)}
              disabled={!nextNavId}
              aria-label="Nächstes Level"
              className="p-2 rounded-lg bg-stone-200 disabled:opacity-40"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Neu eingehängt je Level und je ersetztem Brett: so überlebt kein Zustand des alten Levels */}
        <PlayArea
          key={`${mode}:${level.id}:${rt.content.boardRevision(level.id)}`}
          level={level}
          mode={mode}
          overlayOpen={overlay !== null}
          hasNext={nextId !== null}
          onNext={() => nextId && goLevel(nextId)}
          onSolved={() => rt.reportSolved(level.id)}
          onReset={() => rt.reportReset(level.id)}
        />
      </div>

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
    </div>
  );
}
