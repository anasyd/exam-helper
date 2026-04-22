import { Sparkles, Eye, Timer, Lock } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Bring your own AI.",
    description:
      "Gemini, OpenAI, Claude, OpenRouter — configure once, pick a different model per feature if you want.",
  },
  {
    icon: Eye,
    title: "Vision-aware.",
    description:
      "Flagship models read your PDF directly. Diagrams, equations, and scanned pages stay intact.",
  },
  {
    icon: Timer,
    title: "Spaced repetition.",
    description:
      "Cards you struggle with resurface more often. Cards you know fade. No manual scheduling.",
  },
  {
    icon: Lock,
    title: "Runs in your browser.",
    description:
      "Your projects and API keys stay on your device. No accounts required to start.",
  },
];

export function Features() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
      <div className="mb-14">
        <div className="label mb-3">Features</div>
        <h2 className="display text-3xl md:text-4xl max-w-2xl">
          Thoughtful choices, from document to recall.
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex gap-5">
            <div className="flex-shrink-0 w-10 h-10 rounded-full border border-[color:var(--rule)] flex items-center justify-center">
              <f.icon className="w-4 h-4 text-[color:var(--ink)]" />
            </div>
            <div>
              <h3 className="display text-xl mb-2">{f.title}</h3>
              <p className="text-[color:var(--muted)] leading-relaxed text-[15px]">
                {f.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
