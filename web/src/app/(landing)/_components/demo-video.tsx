export function DemoVideo() {
  return (
    <section id="demo" className="max-w-5xl mx-auto px-6 py-16 md:py-24">
      <div className="relative rounded-sm overflow-hidden border border-[color:var(--rule)] shadow-[0_30px_60px_-15px_rgba(17,17,17,0.15)] bg-[color:var(--ink)]">
        <div className="aspect-video">
          <video
            className="w-full h-full object-cover"
            src="/demo.mp4"
            poster="/demo-poster.png"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        </div>
      </div>
      <p className="text-center mt-6 text-sm text-[color:var(--muted)]">
        Upload a PDF. Switch providers on the fly. Study with spaced repetition.
      </p>
    </section>
  );
}
