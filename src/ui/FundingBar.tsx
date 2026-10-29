import logoEsfEu from "../assets/funding/esf-eu.webp";
import logoEu from "../assets/funding/eu.webp";
import logoSachsen from "../assets/funding/freistaat-sachsen.webp";

/* Die Bilder bringen eigenen Weißraum mit; das ESF-Logo hat die kleinste Schrift und
   bekommt deshalb etwas mehr Höhe, damit die Schriftzüge ähnlich groß wirken. */
const LOGOS: { src: string; alt: string; height: string }[] = [
  { src: logoEu, alt: "Kofinanziert von der Europäischen Union", height: "h-10" },
  { src: logoEsfEu, alt: "Europa fördert Sachsen – Europäischer Sozialfonds", height: "h-12" },
  {
    src: logoSachsen,
    alt: "Freistaat Sachsen – mitfinanziert durch Steuermittel auf der Grundlage des vom Sächsischen Landtag beschlossenen Haushaltes",
    height: "h-10",
  },
];

export function FundingBar() {
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-8 gap-y-1 border-t border-stone-200 bg-white px-4 py-1">
      {LOGOS.map((logo) => (
        <img key={logo.src} src={logo.src} alt={logo.alt} className={`${logo.height} w-auto`} />
      ))}
    </footer>
  );
}
