// Full-width pull-quote block. Display-size quote, author + role beneath.
// Rounded-40 surface-subtle panel. Server component.

interface UseCaseQuoteBlockProps {
  quote: string;
  author: string;
  role: string;
}

export function UseCaseQuoteBlock({
  quote,
  author,
  role,
}: UseCaseQuoteBlockProps) {
  return (
    <section className="px-6">
      <div className="mx-auto max-w-6xl">
        <figure className="surface-subtle rounded-[40px] border border-black/[0.06] p-10 sm:p-16">
          <span
            aria-hidden="true"
            className="block text-indigo-600 font-serif"
            style={{ fontSize: 56, lineHeight: 0.9, letterSpacing: "-0.04em" }}
          >
            {"\""}
          </span>
          <blockquote
            className="mt-2 text-[#111] max-w-4xl"
            style={{
              fontSize: 40,
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
              fontWeight: 600,
            }}
          >
            {quote}
          </blockquote>
          <figcaption className="mt-8 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#111] text-white t-caption font-semibold">
              {author
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase()}
            </span>
            <div className="flex flex-col">
              <span className="t-label font-semibold text-[#111]">
                {author}
              </span>
              <span className="t-caption text-[#8E8E93]">{role}</span>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
