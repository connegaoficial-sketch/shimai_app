/**
 * Public customer shell — presentational only.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-shimai-black text-shimai-ivory">
      {/* THESIS: sushi de hermanas llega a casa — pedir es la acción.
          OWN-WORLD: shimai-black / gold / sakura / ivory; logo-led hero.
          STORY: entiende → confía (horario/zona/pago) → pide ahora.
          FIRST VIEWPORT: logo, headline, support, CTA Pedir ahora.
          FORM: elevate incumbent SHIMAI for conversion (refine-public-home).
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance */}
      {children}
    </div>
  );
}
