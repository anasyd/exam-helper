import { LandingNav } from "@/app/(landing)/_components/landing-nav";
import { Footer } from "@/app/(landing)/_components/footer";

export const metadata = {
  title: "Privacy Policy — exam-helper",
  description: "How exam-helper collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <>
      <LandingNav />
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="display text-4xl mb-2">Privacy Policy</h1>
        <p className="text-[color:var(--muted)] text-sm mb-12">Last updated: April 24, 2026</p>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-base mb-3">1. What exam-helper is</h2>
            <p className="text-[color:var(--muted)]">
              exam-helper is a study tool that turns your own documents (PDFs, notes) into flashcards,
              study guides, and structured roadmaps. AI generation is powered by API keys you supply
              — we never use our own AI credits to process your content, and we never retain your
              API keys beyond the duration of a single generation request.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">2. Information we collect</h2>
            <ul className="list-disc pl-5 space-y-2 text-[color:var(--muted)]">
              <li>
                <strong className="text-[color:var(--ink)]">Account information</strong> — your name, email address, and (if you sign in with Google) your Google profile name and avatar. Passwords are hashed with bcrypt and never stored in plain text.
              </li>
              <li>
                <strong className="text-[color:var(--ink)]">Uploaded documents</strong> — PDFs and other files you upload are stored in our database (MongoDB GridFS) to enable sync across devices. They are associated with your account and project.
              </li>
              <li>
                <strong className="text-[color:var(--ink)]">Generated study content</strong> — flashcards, study guides, and transcripts produced from your documents are stored in your project so you can access them from any device.
              </li>
              <li>
                <strong className="text-[color:var(--ink)]">Usage data</strong> — basic account metadata such as project count and plan tier. We do not run analytics trackers or sell usage data.
              </li>
              <li>
                <strong className="text-[color:var(--ink)]">Billing information</strong> — if you subscribe, your payment is processed entirely by Stripe. We store only your Stripe customer ID and subscription tier. We never see or store your card number, CVV, or bank details.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">3. Your AI API keys</h2>
            <p className="text-[color:var(--muted)]">
              When you trigger server-side generation (the &ldquo;Generate in background&rdquo; feature),
              your API key is encrypted in your browser using our server&rsquo;s RSA public key before
              transmission. On the server it is stored only for the duration of the generation job and is
              permanently deleted — via a database <code>$unset</code> — the moment the job completes or
              fails. The key is never written to logs. Your API keys are never used for any purpose other
              than the specific generation you initiated.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">4. How we use your information</h2>
            <ul className="list-disc pl-5 space-y-2 text-[color:var(--muted)]">
              <li>To operate your account and sync your projects across devices.</li>
              <li>To enforce plan limits (project count, file sizes) based on your subscription tier.</li>
              <li>To send transactional emails — email verification, password reset — via Resend. We send no marketing email.</li>
              <li>To process subscription payments via Stripe.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">5. Data sharing</h2>
            <p className="text-[color:var(--muted)]">
              We do not sell, rent, or share your personal data with third parties for marketing. The
              only third-party services that receive your data are:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2 text-[color:var(--muted)]">
              <li><strong className="text-[color:var(--ink)]">Stripe</strong> — payment processing. Governed by Stripe&rsquo;s Privacy Policy.</li>
              <li><strong className="text-[color:var(--ink)]">Resend</strong> — transactional email delivery. Receives your email address for the purpose of sending you messages you explicitly requested (e.g., a verification link).</li>
              <li><strong className="text-[color:var(--ink)]">AI providers you choose</strong> — when you generate content, your document text is sent to the AI provider whose API key you have configured (e.g., Google, OpenAI, Anthropic, OpenRouter). This is governed by that provider&rsquo;s terms and privacy policy, not ours.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">6. Data retention and deletion</h2>
            <p className="text-[color:var(--muted)]">
              Your data is retained for as long as your account is active. You can delete individual
              projects (including all uploaded files and generated content) at any time from within the
              app. To delete your entire account and all associated data, contact us at{" "}
              <a href="mailto:privacy@examhelper.app" className="underline underline-offset-2">
                privacy@examhelper.app
              </a>
              . We will process deletion requests within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">7. Security</h2>
            <p className="text-[color:var(--muted)]">
              We use HTTPS for all data in transit. Passwords are hashed. API keys in transit are
              RSA-OAEP encrypted. Database access is restricted to authenticated server processes.
              No security measure is perfect; if you discover a vulnerability please disclose it
              responsibly to{" "}
              <a href="mailto:security@examhelper.app" className="underline underline-offset-2">
                security@examhelper.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">8. Self-hosted instances</h2>
            <p className="text-[color:var(--muted)]">
              exam-helper is open source. If you self-host it, you operate as your own data controller.
              This Privacy Policy applies only to the cloud instance at examhelper.app.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">9. Contact</h2>
            <p className="text-[color:var(--muted)]">
              Questions about this policy:{" "}
              <a href="mailto:privacy@examhelper.app" className="underline underline-offset-2">
                privacy@examhelper.app
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
