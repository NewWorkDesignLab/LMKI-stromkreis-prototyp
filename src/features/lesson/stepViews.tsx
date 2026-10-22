import { ArrowRight, CheckCircle2, CircleHelp, Lightbulb, XCircle } from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";
import type {
  AnswerValue,
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
  type StepProgress,
} from "../../engine/lesson";
import { unitAliases } from "../../engine/quantity";
import { BuildStepView } from "./BuildStepView";
import { Blocks } from "./Blocks";

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
  complete: () => void;
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

export function ProceedButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto flex min-h-11 items-center gap-1.5 rounded-lg bg-stone-800 px-4 text-sm font-medium text-white hover:bg-stone-900"
    >
      {label} <ArrowRight size={16} aria-hidden="true" />
    </button>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl border border-stone-200 bg-white p-4">{children}</section>;
}

function ContextView({ step, proceed, proceedLabel }: StepViewProps<ContextStep>) {
  return (
    <Card>
      {step.heading && <h2 className="mb-3 text-base font-semibold">{step.heading}</h2>}
      <Blocks blocks={step.blocks} />
      <div className="mt-4 flex">
        <ProceedButton label={proceedLabel} onClick={proceed} />
      </div>
    </Card>
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
  submit,
  proceed,
  proceedLabel,
}: StepViewProps<PredictStep>) {
  const chosen = progress.answer?.k === "choice" ? progress.answer.ids : [];
  const [sel, setSel] = useState<string[]>(chosen);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
        <CircleHelp size={14} aria-hidden="true" /> Deine Vermutung
      </p>
      <h2 className="mb-3 text-base font-semibold">{step.question}</h2>
      <Blocks blocks={step.blocks} />
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
  );
}

function QuizView({ step, progress, submit, proceed, proceedLabel }: StepViewProps<QuizStep>) {
  const spec = step.answer;
  const [sel, setSel] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Evaluation | null>(null);
  const check = () => {
    setResult(submit(spec.k === "choice" ? { k: "choice", ids: sel } : { k: "number", text }));
  };
  const solved = progress.done;
  return (
    <Card>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">Frage</p>
      <h2 className="mb-3 text-base font-semibold">{step.question}</h2>
      <Blocks blocks={step.blocks} />
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
        {result && "error" in result && <p className="mt-2 text-sm text-red-600">{result.error}</p>}
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
        <details className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3" open={solved}>
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
  );
}

function SummaryView({ step, level, lesson, proceed, proceedLabel }: StepViewProps<SummaryStep>) {
  const predict = level.steps.find(
    (s): s is PredictStep => s.kind === "predict" && s.id === step.recall,
  );
  const said = predict && stepProgress(lesson, predict.id).answer;
  const text = (id: string) => predict?.choices.find((c) => c.id === id)?.text;
  const saidId = said?.k === "choice" ? said.ids[0] : undefined;
  return (
    <Card>
      <p className="flex gap-2 text-base font-medium leading-snug text-emerald-900">
        <Lightbulb size={20} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
        {step.lesson}
      </p>
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
      <div className="mt-3">
        <Blocks blocks={step.blocks} />
      </div>
      <div className="mt-4 flex">
        <ProceedButton label={proceedLabel} onClick={proceed} />
      </div>
    </Card>
  );
}
