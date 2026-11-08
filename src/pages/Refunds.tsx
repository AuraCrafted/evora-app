import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Refunds() {
  return (
    <main className="min-h-screen px-5 py-8 max-w-2xl lg:max-w-4xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">Refund Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: November 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground/90 leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-semibold mb-2">Apple App Store purchases</h2>
          <p>
            Evora subscriptions purchased through the App Store are billed by Apple. Refund
            eligibility, approval, and processing are handled by Apple under its policies and
            applicable law. Evora does not offer a separate 30-day money-back guarantee for these purchases.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">How to request a refund</h2>
          <p>
            To request a refund, visit{" "}
            <a href="https://reportaproblem.apple.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">reportaproblem.apple.com</a>,
            sign in with the Apple Account used for your purchase, and follow Apple's refund request
            process. Apple decides whether a purchase qualifies for a refund and provides processing
            information. Evora cannot approve or issue App Store refunds on Apple's behalf.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">Cancellations</h2>
          <p>
            To cancel, open your iPhone's Settings → your name → Subscriptions → Evora, then choose
            Cancel Subscription (or Cancel Free Trial). Cancellation turns off automatic renewal;
            access continues until the expiration date Apple reports. If you do not want a trial
            to renew, cancel at least 24 hours before it ends. Apple may end free-trial access
            immediately when you cancel. Cancelling does not automatically refund previous charges,
            and deleting Evora or your account does not cancel your subscription.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">Questions</h2>
          <p>
            For questions or help with Evora, visit the{" "}
            <Link to="/feedback" className="text-primary underline underline-offset-4">Feedback page</Link>.
            For App Store refund requests, use Apple's process above.
          </p>
        </section>
      </div>

      <footer className="mt-12 pt-6 border-t border-border/60">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Notice</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link>
          <Link to="/feedback" className="hover:text-foreground transition-colors">Feedback</Link>
        </div>
      </footer>
    </main>
  );
}
