import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <main className="min-h-screen px-5 py-8 max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">Privacy Notice</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground/90 leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-semibold mb-2">1. Who we are</h2>
          <p>
            Evora is operated by AURACRAFTED LLC ("we", "us", "our"). AURACRAFTED LLC is the data
            controller responsible for personal data processed through the app.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">2. What we collect</h2>
          <p>
            We collect the email and password you provide at sign-up, the nudges you accept or
            skip, your streak data, your selected energy and preferences, support messages, and
            basic device/usage information (e.g. device identifiers, IP address) needed to keep
            the app working.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">3. How we use it</h2>
          <p>
            We use your data to create your account, provide and personalize the service, sync your
            plan across devices, prevent fraud and abuse, provide customer support, and improve
            the product. Our legal bases are performance of our contract with you, our legitimate
            interests in operating and improving the service, your consent where required, and
            compliance with legal obligations.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">4. Who we share it with</h2>
          <p>
            We share data with: (a) service providers and subprocessors that help us host and
            operate the app (hosting, analytics, support tooling); (b) Paddle.com, our Merchant of
            Record, for sale of the product, subscription management, payments, tax compliance,
            and invoicing; (c) professional advisers (legal, accounting); and (d) authorities
            where required by law. We never sell your data.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">5. Data retention</h2>
          <p>
            We keep your data for as long as your account is active and for a reasonable period
            after, in order to provide the service and meet legal obligations. When data is no
            longer needed, we delete or anonymize it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">6. Your rights</h2>
          <p>
            Subject to applicable law, you have the right to access, correct, delete, or export
            your data, restrict or object to processing, and withdraw consent at any time. You can
            request a copy of your data, cancel your subscription from the Plans page, or delete
            your account by contacting us via the Feedback page. If you are in the UK/EEA, you
            also have the right to complain to your local supervisory authority.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">7. Security</h2>
          <p>
            We use appropriate technical and organizational measures, including encryption in
            transit and access controls, to protect your data. No system is 100% secure, but we
            work hard to keep yours safe.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">8. Cookies & storage</h2>
          <p>
            We use essential local storage to remember your session, streak, and tutorial
            progress. We do not use third-party advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">9. International transfers</h2>
          <p>
            Your data may be processed in countries other than your own. Where required, we rely
            on appropriate safeguards such as Standard Contractual Clauses or adequacy decisions.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">10. Contact</h2>
          <p>
            Questions about your privacy? Reach out via the Feedback page in the app and
            AURACRAFTED LLC will get back to you.
          </p>
        </section>
      </div>

      <footer className="mt-12 pt-6 border-t border-border/60">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link>
          <Link to="/refunds" className="hover:text-foreground transition-colors">Refund Policy</Link>
        </div>
      </footer>
    </main>
  );
}
