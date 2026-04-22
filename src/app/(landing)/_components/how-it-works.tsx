const STEPS = [
  {
    num: "01",
    title: "Upload.",
    description: "Drop a PDF, DOCX, or paste text.",
  },
  {
    num: "02",
    title: "Generate.",
    description: "Pick a model per feature — flashcards, notes, study guide.",
  },
  {
    num: "03",
    title: "Study.",
    description: "Spaced-repetition flashcards, structured notes, shareable projects.",
  },
];

export function HowItWorks() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16 md:py-24 border-t border-[color:var(--rule)]">
      <div className="mb-14">
        <div className="label mb-3">How it works</div>
        <h2 className="display text-3xl md:text-4xl max-w-2xl">
          Three steps, start to study session.
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {STEPS.map((s) => (
          <div key={s.num}>
            <div className="display text-5xl text-[color:var(--accent)] mb-4">
              {s.num}
            </div>
            <h3 className="display text-xl mb-2">{s.title}</h3>
            <p className="text-[color:var(--muted)] leading-relaxed text-[15px]">
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
