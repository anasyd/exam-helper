import { LandingNav } from "@/app/(landing)/_components/landing-nav";
import { Footer } from "@/app/(landing)/_components/footer";

export const metadata = {
  title: "Terms of Service — exam-helper",
  description: "Terms governing your use of exam-helper.",
};

export default function TermsPage() {
  return (
    <>
      <LandingNav />
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="display text-4xl mb-2">Terms of Service</h1>
        <p className="text-[color:var(--muted)] text-sm mb-12">Last updated: April 24, 2026</p>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-base mb-3">1. Acceptance</h2>
            <p className="text-[color:var(--muted)]">
              By creating an account or using exam-helper (&ldquo;the Service&rdquo;), you agree to these
              Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, do not use the Service. These Terms
              govern only the cloud-hosted instance at exam-helper.app; self-hosted deployments are
              governed by the open-source license.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">2. The Service</h2>
            <p className="text-[color:var(--muted)]">
              exam-helper is a study tool that converts documents you upload into flashcards, study
              guides, and learning roadmaps. AI generation requires you to supply your own API key
              from a third-party AI provider (e.g., Google Gemini, OpenAI, Anthropic, OpenRouter).
              We provide the platform; you are responsible for your API key usage and any costs
              charged by your AI provider.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">3. Accounts</h2>
            <ul className="list-disc pl-5 space-y-2 text-[color:var(--muted)]">
              <li>You must be at least 13 years old (or the minimum age required in your jurisdiction) to create an account.</li>
              <li>You are responsible for maintaining the confidentiality of your password.</li>
              <li>You may not share your account with others or create accounts on behalf of others without their consent.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">4. Acceptable use</h2>
            <p className="text-[color:var(--muted)] mb-2">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 text-[color:var(--muted)]">
              <li>Upload documents that you do not have the right to use (e.g., copyrighted material you do not own or license).</li>
              <li>Use the Service to generate, store, or distribute illegal, harmful, defamatory, or otherwise objectionable content.</li>
              <li>Attempt to reverse-engineer, scrape, or abuse the Service in ways that degrade performance for other users.</li>
              <li>Circumvent plan limits through technical means.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">5. Your content</h2>
            <p className="text-[color:var(--muted)]">
              You retain all ownership rights to documents you upload and study content generated
              from them. By uploading content, you grant us a limited license to store and serve it
              back to you across your devices. We do not claim any rights to your content and do
              not use it for any purpose other than providing the Service to you.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">6. Subscriptions and billing</h2>
            <ul className="list-disc pl-5 space-y-2 text-[color:var(--muted)]">
              <li>Free accounts are subject to the limits shown on the pricing page.</li>
              <li>Paid subscriptions (Student, Pro) are billed monthly or annually via Stripe.</li>
              <li>You may cancel at any time; access continues until the end of the current billing period.</li>
              <li>We reserve the right to change prices with 30 days&rsquo; notice. Price changes do not apply to your current billing period.</li>
              <li>Refunds are handled on a case-by-case basis. Contact us within 7 days of a charge if you believe you were billed incorrectly.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">7. Third-party AI providers</h2>
            <p className="text-[color:var(--muted)]">
              When you use your own API key to generate content, your document text is transmitted
              to the AI provider you selected. You are solely responsible for compliance with that
              provider&rsquo;s terms of service, including any restrictions on the content you submit.
              exam-helper is not responsible for the output quality, accuracy, or legality of
              AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">8. Availability and modifications</h2>
            <p className="text-[color:var(--muted)]">
              We aim for high availability but do not guarantee uninterrupted access. We may modify,
              suspend, or discontinue the Service (or any feature) at any time. For material changes
              that affect paid subscribers, we will provide reasonable notice by email.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">9. Disclaimer of warranties</h2>
            <p className="text-[color:var(--muted)]">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
              express or implied, including but not limited to merchantability, fitness for a
              particular purpose, or non-infringement. We do not warrant that the Service will be
              error-free, secure, or that generated study content will be accurate or complete.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">10. Limitation of liability</h2>
            <p className="text-[color:var(--muted)]">
              To the maximum extent permitted by law, exam-helper and its operators shall not be
              liable for any indirect, incidental, special, or consequential damages arising from
              your use of the Service, including but not limited to loss of data or academic
              outcomes. Our total liability for any claim shall not exceed the amount you paid us
              in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">11. Termination</h2>
            <p className="text-[color:var(--muted)]">
              You may close your account at any time. We may suspend or terminate accounts that
              violate these Terms, with or without notice, at our sole discretion. Upon termination,
              your data may be deleted in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">12. Governing law</h2>
            <p className="text-[color:var(--muted)]">
              These Terms are governed by the laws of the jurisdiction in which the operator resides,
              without regard to conflict of law provisions. Disputes shall be resolved by binding
              arbitration or small claims court, as applicable.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">13. Changes to these Terms</h2>
            <p className="text-[color:var(--muted)]">
              We may update these Terms. Material changes will be notified by email or an in-app
              notice at least 14 days before taking effect. Continued use of the Service after the
              effective date constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3">14. Contact</h2>
            <p className="text-[color:var(--muted)]">
              Questions about these Terms:{" "}
              <a href="mailto:legal@exam-helper.app" className="underline underline-offset-2">
                legal@exam-helper.app
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
