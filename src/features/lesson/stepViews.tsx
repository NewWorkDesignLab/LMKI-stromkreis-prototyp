import { ArrowRight, CheckCircle2, Circle, CircleHelp, Lightbulb, XCircle } from "lucide-react";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import type {
  AnswerValue,
  Block,
  Circuit,
  ContextStep,
  LevelDef,
  PredictStep,
  QuizStep,
  Step,
  StepKind,
  SummaryStep,
} from "../../domain/types";
import {
  stepProgress,
  type Evaluation,
  type LessonState,
  type Stage,
  type StepProgress,
} from "../../engine/lesson";
import { reviewGoals } from "../../engine/goals";
import { unitAliases } from "../../engine/quantity";
import { PANEL_HEADING } from "../../ui/heading";
import { BuildStepView } from "./BuildStepView";
import { Blocks } from "./Blocks";
import { CircuitStage, StageLayout, VisualStage, splitVisual } from "./Stage";

/** Was jede Schrittdarstellung bekommt. */
export interface StepViewProps<S extends Step = Step> {
  step: S;
  level: LevelDef;
  lesson: LessonState;
  progress: StepProgress;
  /** sichtbar; verborgene Schritte bleiben eingehängt, damit ihr Zustand erhalten bleibt */
  active: boolean;
  overlayOpen: boolean;
  proceed: () => void;
  proceedLabel: string;
  /** Schaltung neben dem Text (stageOf); null, wenn das Level keinen Bauschritt hat */
  stage: Stage | null;
  /** Schritt erledigt; ein Bauschritt gibt die Schaltung mit, die ihn gelöst hat */
  complete: (circuit?: Circuit) => void;
  submit: (value: AnswerValue) => Evaluation;
  onReset: () => void;
}

/* Darstellung je Schrittart. Eine neue Art braucht hier einen Eintrag – die Typprüfung
   meldet, wenn er fehlt. */
export const STEP_VIEWS: {
  [K in StepKind]: ComponentType<StepViewProps<Extract<Step, { kind: K }>>>;
} = {
  context: ContextView,
  predict: PredictView,
  build: BuildStepView,
  quiz: QuizView,
  summary: SummaryView,
};

/** Standardname eines Schritts in der Schrittleiste. */
export const KIND_LABEL: Record<StepKind, string> = {
  context: "Einstieg",
  predict: "Vermutung",
  build: "Bauen",
  quiz: "Frage",
  summary: "Merksatz",
};

export function ProceedButton({
  label,
  onClick,
  className = "ml-auto",
}: {
  label: string;
  onClick: () => void;
  /** Platzierung; Standard: rechtsbündig in einer Zeile */
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center gap-1.5 rounded-lg bg-stone-800 px-4 text-sm font-medium text-white hover:bg-stone-900 ${className}`}
    >
      {label} <ArrowRight size={16} aria-hidden="true" />
    </button>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl border border-stone-200 bg-white p-4">{children}</section>;
}

/* Was auf die Bühne kommt: eine Anschauung aus den eigenen Bausteinen hat Vorrang – sie
   wurde für diesen Schritt ausgesucht –, sonst die Schaltung des Levels. Der Merksatz
   zeigt immer die Schaltung, weil er sich auf sie bezieht. */
function pickStage(
  blocks: Block[] | undefined,
  stage: Stage | null,
  circuitFirst = false,
): { el: ReactNode; rest: Block[] } {
  const { visual, rest } = splitVisual(blocks);
  const circuit = stage && <CircuitStage stage={stage} />;
  if (circuitFirst && circuit) return { el: circuit, rest: blocks ?? [] };
  return visual
    ? { el: <VisualStage block={visual} />, rest }
    : { el: circuit, rest: blocks ?? [] };
}

function ContextView({ step, proceed, proceedLabel }: StepViewProps<ContextStep>) {
  /* Ein Einstieg zeigt nur, was er selbst mitbringt – die Schaltung kommt erst später. */
  const { el, rest } = pickStage(step.blocks, null);
  return (
    <StageLayout stage={el}>
      <Card>
        {step.heading && <h2 className="mb-3 text-base font-semibold">{step.heading}</h2>}
        <Blocks blocks={rest} />
        <div className="mt-4 flex">
          <ProceedButton label={proceedLabel} onClick={proceed} />
        </div>
      </Card>
    </StageLayout>
  );
}

/* Auswahl als Radiogruppe bzw. Kästchen, wenn mehrere Antworten richtig sein können. */
function ChoiceList({
  name,
  choices,
  multiple,
  selected,
  onChange,
  disabled,
}: {
  name: string;
  choices: { id: string; text: string }[];
  multiple: boolean;
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      {choices.map((c) => {
        const on = selected.includes(c.id);
        return (
          <label
            key={c.id}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${on ? "border-stone-800 bg-stone-50" : "border-stone-200 hover:bg-stone-50"} ${disabled ? "cursor-default" : ""}`}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              checked={on}
              onChange={() =>
                onChange(
                  multiple
                    ? on
                      ? selected.filter((x) => x !== c.id)
                      : [...selected, c.id]
                    : [c.id],
                )
              }
              className="h-4 w-4 accent-stone-800"
            />
            {c.text}
          </label>
        );
      })}
    </fieldset>
  );
}

function PredictView({
  step,
  progress,
  stage,
  submit,
  proceed,
  proceedLabel,
}: StepViewProps<PredictStep>) {
  const chosen = progress.answer?.k === "choice" ? progress.answer.ids : [];
  const [sel, setSel] = useState<string[]>(chosen);
  const [error, setError] = useState<string | null>(null);
  const { el, rest } = pickStage(step.blocks, stage);
  return (
    <StageLayout stage={el}>
      <Card>
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
          <CircleHelp size={14} aria-hidden="true" /> Deine Vermutung
        </p>
        <h2 className="mb-3 text-base font-semibold">{step.question}</h2>
        <Blocks blocks={rest} />
        <div className="mt-3">
          <ChoiceList
            name={step.id}
            choices={step.choices}
            multiple={false}
            selected={progress.done ? chosen : sel}
            onChange={setSel}
            disabled={progress.done}
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex items-center gap-3">
          {progress.done ? (
            <>
              <p className="text-sm text-stone-500">
                Festgehalten. Ob du richtig liegst, siehst du am Ende.
              </p>
              <ProceedButton label={proceedLabel} onClick={proceed} />
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                const r = submit({ k: "choice", ids: sel });
                setError("error" in r ? r.error : null);
              }}
              className="ml-auto min-h-11 rounded-lg bg-stone-800 px-4 text-sm font-medium text-white"
            >
              Vermutung festhalten
            </button>
          )}
        </div>
      </Card>
    </StageLayout>
  );
}

function QuizView({
  step,
  progress,
  stage,
  submit,
  proceed,
  proceedLabel,
}: StepViewProps<QuizStep>) {
  const spec = step.answer;
  const [sel, setSel] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Evaluation | null>(null);
  const check = () => {
    setResult(submit(spec.k === "choice" ? { k: "choice", ids: sel } : { k: "number", text }));
  };
  const solved = progress.done;
  const { el, rest } = pickStage(step.blocks, stage);
  return (
    <StageLayout stage={el}>
      <Card>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">Frage</p>
        <h2 className="mb-3 text-base font-semibold">{step.question}</h2>
        <Blocks blocks={rest} />
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          {spec.k === "choice" ? (
            <ChoiceList
              name={step.id}
              choices={spec.choices}
              multiple={spec.correct.length > 1}
              selected={sel}
              onChange={setSel}
              disabled={solved}
            />
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <input
                aria-label={`Antwort in ${unitAliases(spec.unit)[0]}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                inputMode="decimal"
                disabled={solved}
                placeholder="Zahl eingeben"
                className="min-h-11 w-40 rounded-lg border border-stone-300 px-3 text-base"
              />
              <span className="font-medium text-stone-600">{unitAliases(spec.unit)[0]}</span>
            </label>
          )}
          {!solved && (
            <button
              type="submit"
              className="mt-3 min-h-11 rounded-lg bg-stone-800 px-4 text-sm font-medium text-white"
            >
              Prüfen
            </button>
          )}
        </form>
        <div aria-live="polite">
          {result && "error" in result && (
            <p className="mt-2 text-sm text-red-600">{result.error}</p>
          )}
          {result && "correct" in result && !result.correct && !solved && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
              <XCircle size={16} aria-hidden="true" /> Noch nicht richtig – prüfe deinen Weg und
              versuche es noch einmal.
            </p>
          )}
          {solved && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={16} aria-hidden="true" /> Richtig!
            </p>
          )}
        </div>
        {/* Der Lösungsweg kommt erst nach dem ersten Versuch: wer ihn vorher liest,
          rechnet nicht mehr selbst. */}
        {step.explanation && progress.attempts > 0 && (
          <details
            className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3"
            open={solved}
          >
            <summary className="cursor-pointer text-sm font-medium">Lösungsweg</summary>
            <div className="mt-2">
              <Blocks blocks={step.explanation} />
            </div>
          </details>
        )}
        {solved && (
          <div className="mt-4 flex">
            <ProceedButton label={proceedLabel} onClick={proceed} />
          </div>
        )}
      </Card>
    </StageLayout>
  );
}

function SummaryView({
  step,
  level,
  lesson,
  stage,
  proceed,
  proceedLabel,
}: StepViewProps<SummaryStep>) {
  const predict = level.steps.find(
    (s): s is PredictStep => s.kind === "predict" && s.id === step.recall,
  );
  const said = predict && stepProgress(lesson, predict.id).answer;
  const text = (id: string) => predict?.choices.find((c) => c.id === id)?.text;
  const saidId = said?.k === "choice" ? said.ids[0] : undefined;
  const { el, rest } = pickStage(step.blocks, stage, true);
  /* Rückblick: die Aufgabe und was davon erreicht ist, dann der Merksatz, dann die
     Erklärung. So entsteht der Zusammenhang Aufgabe → Tun → Erkenntnis auf einer Seite. */
  const items = useMemo(() => (stage ? reviewGoals(stage.build, stage.circuit) : []), [stage]);
  return (
    <StageLayout stage={el}>
      <Card>
        {stage && (
          <section aria-label="Rückblick">
            <h2 className={`${PANEL_HEADING} flex items-center gap-1.5`}>
              <CheckCircle2 size={15} className="text-emerald-600" aria-hidden="true" /> Das war die
              Aufgabe
            </h2>
            <p className="text-sm leading-relaxed text-stone-700">{stage.build.task}</p>
            {items.length > 0 && (
              <ul aria-label="Ziele" className="mt-2 flex flex-col gap-1">
                {items.map((it, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-1.5 text-sm ${it.ok ? "text-emerald-700" : "text-stone-600"}`}
                  >
                    {it.ok ? (
                      <CheckCircle2 size={17} className="mt-px shrink-0" aria-label="erreicht" />
                    ) : (
                      <Circle
                        size={17}
                        className="mt-px shrink-0 text-stone-300"
                        aria-label="offen"
                      />
                    )}
                    <span>{it.t}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        <section
          aria-label="Merksatz"
          className={`rounded-xl border border-amber-200 bg-amber-50 p-3 ${stage ? "mt-4" : ""}`}
        >
          <h2 className={`${PANEL_HEADING} flex items-center gap-1.5 text-amber-800`}>
            <Lightbulb size={15} className="text-amber-500" aria-hidden="true" /> Merke
          </h2>
          <p className="text-base font-medium leading-snug text-stone-900">{step.lesson}</p>
        </section>
        {predict && saidId && (
          <div className="mt-3 rounded-lg bg-stone-50 p-3 text-sm">
            <p>
              Deine Vermutung: <strong>{text(saidId)}</strong>
            </p>
            {predict.correct && (
              <p className="mt-1">
                {saidId === predict.correct
                  ? "Genau so ist es."
                  : `Tatsächlich: ${text(predict.correct)}`}
              </p>
            )}
          </div>
        )}
        {rest.length > 0 && (
          <section aria-label="Erklärung" className="mt-4">
            <h2 className={PANEL_HEADING}>Warum das so ist</h2>
            <Blocks blocks={rest} />
          </section>
        )}
        <div className="mt-4 flex">
          <ProceedButton label={proceedLabel} onClick={proceed} />
        </div>
      </Card>
    </StageLayout>
  );
}
