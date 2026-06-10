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
          <h2 className="font-display text-xl font-semibold mb-2">1. What we collect</h2>
          <p>
            When you use Evora, we collect the email and password you provide at sign-up, the
            nudges you accept or skip, your streak data, your selected energy and preferences, and
            basic device information needed to keep the app working.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">2. How we use it</h2>
          <p>
            We use your data to personalize suggestions, sync your plan across devices, process
            subscription payments through our payment provider, and improve the product. We never
            sell your data.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">3. Payments</h2>
          <p>
            Subscription payments are handled by our payment processor. We do not store your card
            details on our servers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">4. Your choices</h2>
          <p>
            You can request a copy of your data, cancel your subscription from the Plans page, or
            delete your account at any time by contacting support. Cancelling stops future charges
            and keeps access until the end of the current billing period.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">5. Cookies & storage</h2>
          <p>
            We use local storage to remember your session, streak, and tutorial progress. No
            third-party advertising cookies are used.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">6. Contact</h2>
          <p>
            Questions about your privacy? Reach out via the Feedback page in the app and we'll get
            back to you.
          </p>
        </section>
      </div>
    </main>
  );
}
