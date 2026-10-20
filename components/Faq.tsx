import JsonLd from "./JsonLd";

export interface FaqItem {
  q: string;
  a: string;
}

/** FAQ 목록 + FAQPage 구조화 데이터(JSON-LD) */
export default function Faq({ items, heading }: { items: FaqItem[]; heading: string }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((i) => ({
            "@type": "Question",
            name: i.q,
            acceptedAnswer: { "@type": "Answer", text: i.a },
          })),
        }}
      />
      <h2 id="faq-heading" className="mb-4 text-2xl font-bold">
        {heading}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {items.map((i) => (
          <details key={i.q} className="group p-4">
            <summary className="cursor-pointer list-none font-semibold marker:hidden">
              <span className="mr-2 text-accent group-open:hidden">+</span>
              <span className="mr-2 hidden text-accent group-open:inline">−</span>
              {i.q}
            </summary>
            <p className="mt-2 pl-5 leading-relaxed text-muted">{i.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
