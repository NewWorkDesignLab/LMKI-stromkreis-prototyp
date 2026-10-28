import { ExternalLink, Info } from "lucide-react";
import type { ComponentType } from "react";
import type { Block, WidgetId } from "../../domain/types";
import { Formel } from "../widgets/Formel";
import { GhostCircuit } from "../widgets/GhostCircuit";
import { Kuehlschrank } from "../widgets/Kuehlschrank";
import { Lichtschalter } from "../widgets/Lichtschalter";
import { UriDreieck } from "../widgets/UriDreieck";

/* Eingebaute Anschauungen, die Inhalte über `{ k: "widget" }` einbinden. Eine neue kommt
   hier dazu, in WidgetId (domain/types) und in die Prüfung (services/validate). */
const WIDGETS: Record<WidgetId, ComponentType> = {
  "uri-dreieck": UriDreieck,
  kuehlschrank: Kuehlschrank,
  lichtschalter: Lichtschalter,
};

function BlockView({ b }: { b: Block }) {
  switch (b.k) {
    case "p":
      return <p className="leading-relaxed">{b.text}</p>;
    case "list":
      return (
        <ul className="list-disc space-y-1 pl-5 leading-relaxed">
          {b.items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      );
    case "formula":
      return (
        <p className="text-base">
          <Formel>{b.text}</Formel>
        </p>
      );
    case "note":
      return (
        <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 leading-relaxed text-amber-900">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {b.text}
        </p>
      );
    case "image":
      return (
        <figure>
          <img src={b.src} alt={b.alt} className="w-full rounded-xl" loading="lazy" />
          {b.caption && <figcaption className="mt-2 text-stone-500">{b.caption}</figcaption>}
        </figure>
      );
    case "video":
      /* Eigener Player kommt später; bis dahin ein deutlicher Verweis. */
      return (
        <a
          href={b.src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 font-medium text-stone-700 hover:bg-stone-50"
        >
          <ExternalLink size={15} aria-hidden="true" />
          Video: {b.title}
        </a>
      );
    case "widget": {
      const W = WIDGETS[b.widget];
      return (
        <figure>
          <W />
          {b.caption && <figcaption className="mt-2 text-stone-500">{b.caption}</figcaption>}
        </figure>
      );
    }
    case "ghost":
      return <GhostCircuit block={b} />;
  }
}

/** Zeigt Textbausteine untereinander. */
export function Blocks({ blocks }: { blocks?: Block[] }) {
  if (!blocks?.length) return null;
  return (
    <div className="space-y-3 text-sm text-stone-700">
      {blocks.map((b, i) => (
        <BlockView key={i} b={b} />
      ))}
    </div>
  );
}
