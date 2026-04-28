import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Do I need to pay?",
    a: "No — bring your own API key from Gemini, OpenAI, Anthropic, or OpenRouter and use exam-helper for free. Paid Student and Pro plans are available if you want more projects, larger files, or priority support.",
  },
  {
    q: "Does my API key ever reach your server?",
    a: "Not for regular generation. Your API key is stored in your browser and all AI calls go directly from your device to the provider. The only exception is background generation (processing while your tab is closed) — that requires explicit opt-in and the key is deleted from our servers the moment the job finishes.",
  },
  {
    q: "Which AI models are supported?",
    a: "Gemini 2.5 Pro, Flash, and Flash Lite (plus 3.x previews). GPT-4o, GPT-5 family, and o3/o4-mini reasoning models. Claude Haiku 4.5, Sonnet 4.6, and Opus 4.7. Plus 300+ models via OpenRouter. You can assign a different model to each feature.",
  },
  {
    q: "What file types work?",
    a: "PDF is fully supported, including scanned pages and diagrams when using a vision-capable model. Plain text and DOCX also work. Video transcripts are on the roadmap.",
  },
  {
    q: "Can I create more than 5 projects on the free plan?",
    a: "Yes. Once you hit the synced project limit, new projects are saved locally on your device instead. They work exactly the same — flashcards, roadmap, notes — they just aren't backed up to your account or accessible from other devices.",
  },
  {
    q: "Can I use it offline?",
    a: "Study sessions (flashcards, roadmap, notes) work fully offline once a project is loaded. Generating new content requires an internet connection because it calls your AI provider.",
  },
  {
    q: "Can I self-host it?",
    a: "Yes. A single Docker Compose file spins up the full stack — app, API server, and MongoDB. Deploy to any VPS, Coolify, or Portainer instance. See the self-hosting guide in the GitHub repo.",
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
