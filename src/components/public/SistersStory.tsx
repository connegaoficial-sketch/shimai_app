import { cn } from "@/lib/utils";
import type { SistersStorySetting } from "@/lib/sisters/sisters";

type SistersStoryProps = {
  story: SistersStorySetting;
};

export function SistersStory({ story }: SistersStoryProps) {
  return (
    <section
      aria-labelledby="sisters-heading"
      className="relative bg-shimai-black"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <header className="mb-12 max-w-xl animate-shimai-fade-up">
          <h2
            id="sisters-heading"
            className="font-serif text-3xl leading-tight text-shimai-ivory sm:text-4xl"
          >
            {story.heading}
          </h2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-shimai-ivory/50">
            {story.support}
          </p>
        </header>

        <div className="grid gap-10 md:grid-cols-3 md:gap-x-12 md:gap-y-10">
          {story.sisters.map((sister, index) => {
            const isSakura = sister.accent === "sakura";
            return (
              <article
                key={sister.key}
                className="animate-shimai-fade-up min-w-0"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className={cn(
                      "font-serif text-2xl sm:text-3xl",
                      isSakura ? "text-shimai-sakura" : "text-shimai-gold",
                    )}
                  >
                    {sister.label}
                  </span>
                  <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-shimai-ivory/35">
                    {sister.subtitle}
                  </span>
                </div>
                <div
                  aria-hidden
                  className={cn(
                    "my-4 h-px w-8",
                    isSakura ? "bg-shimai-sakura/50" : "bg-shimai-gold/50",
                  )}
                />
                <p className="font-sans text-sm leading-relaxed text-shimai-ivory/55">
                  {sister.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
