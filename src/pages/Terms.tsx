import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <main className="min-h-screen px-5 py-8 max-w-2xl lg:max-w-4xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">Terms & Conditions</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: November 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground/90 leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-semibold mb-2">1. Who we are</h2>
          <p>
            Evora is operated by AURACRAFTED LLC ("we", "us", "our"). By creating an account or using
            the app, you agree to these Terms & Conditions and enter into an agreement with
            AURACRAFTED LLC.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">2. Acceptance</h2>
          <p>
            By continuing to use Evora you confirm you have read, understood, and agreed to these
            terms. You must be of legal age in your jurisdiction and provide accurate account
            information.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">3. Acceptable use</h2>
          <p>
            You agree not to misuse the service. This includes, but is not limited to: unlawful use,
            fraud or spam, infringing intellectual property, attempting to interfere with security
            (malware, probing, scraping), or reverse-engineering the app.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">4. Intellectual property</h2>
          <p>
            AURACRAFTED LLC retains all rights, title, and interest in the Evora app, including its
            software, content, design, and branding. You are granted a limited, non-exclusive,
            non-transferable right to use the service under your selected plan.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">5. Service availability</h2>
          <p>
            We work hard to keep Evora running smoothly but do not guarantee uninterrupted or
            error-free performance. Features may change, be added, or be removed over time.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">6. Payments & subscriptions</h2>
          <p>
            App Store subscriptions are billed by Apple and renew automatically until cancelled.
            Cancel in your iPhone's Settings → your name → Subscriptions → Evora. Access continues
            until the expiration date Apple reports; Apple may end free-trial access immediately
            upon cancellation. To avoid a trial renewing, cancel at least 24 hours before it ends.
            Refund requests are handled by Apple under its policies and applicable law; see our{" "}
            <Link to="/refunds" className="text-primary underline underline-offset-4">Refund Policy</Link>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">7. Suspension & termination</h2>
          <p>
            We may suspend or terminate your access for material breach of these terms, non-payment,
            security or fraud risk, or repeated policy violations. You may stop using Evora at any
            time by cancelling your subscription and deleting your account.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">8. Disclaimers</h2>
          <p>
            Evora provides general wellness suggestions and is not a substitute for professional
            medical, psychological, or financial advice. To the fullest extent permitted by law, we
            disclaim all implied warranties.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">9. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, AURACRAFTED LLC's aggregate liability is limited
            to the fees you paid in the 12 months preceding the claim. We are not liable for
            indirect, consequential, or special damages.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">10. Changes & contact</h2>
          <p>
            We may update these terms from time to time. Material changes will be communicated in
            the app. Questions? Reach out via the{" "}
            <Link to="/feedback" className="text-primary underline underline-offset-4">Feedback page</Link>.
          </p>
        </section>
      </div>

      <footer className="mt-12 pt-6 border-t border-border/60">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Notice</Link>
          <Link to="/refunds" className="hover:text-foreground transition-colors">Refund Policy</Link>
          <Link to="/feedback" className="hover:text-foreground transition-colors">Feedback</Link>
        </div>
      </footer>
    </main>
  );
}
