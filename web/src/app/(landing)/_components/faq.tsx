import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Do I need to pay?",
    a: "No. Bring your own API key from Gemini, OpenAI, Anthropic, or OpenRouter and use it for free. A paid hosted tier is in development.",
  },
  {
    q: "Which AI models are supported?",
    a: "Gemini 2.5 Pro, Flash, and Flash Lite. GPT-5, GPT-5 mini, and GPT-5 nano. Claude Opus 4.7, Sonnet 4.6, and Haiku 4.5. Plus around 300 more models through OpenRouter.",
  },
  {
    q: "Does my data leave my browser?",
    a: "Only when you ask for generation — then the document content is sent to the AI provider you configured. Projects, settings, and API keys are stored locally in browser storage.",
  },
  {
    q: "Can I use it offline?",
    a: "The study session works offline against cards you already have. Generation needs internet because it calls the AI provider.",
  },
  {
    q: "What file types work?",
    a: "PDF, DOCX, and plain text. PowerPoint support is on the roadmap.",
  },
  {
    q: "Is there a paid tier?",
    a: "Not yet. A paid plan with hosted models (no API key required) is in development.",
  },
];

export function Faq() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-16 md:py-24 border-t border-[color:var(--rule)]">
      <div className="mb-10">
        <div className="label mb-3">FAQ</div>
        <h2 className="display text-3xl md:text-4xl">Common questions.</h2>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {FAQS.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left display text-lg">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-[color:var(--muted)] leading-relaxed">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
