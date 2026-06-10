import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Refunds() {
  return (
    <main className="min-h-screen px-5 py-8 max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">Refund Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground/90 leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-semibold mb-2">30-day money-back guarantee</h2>
          <p>
            We want you to feel good about your purchase. AURACRAFTED LLC offers a 30-day
            money-back guarantee on Evora subscriptions. If you're not satisfied, you can request a
            full refund within 30 days of your order date.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">How to request a refund</h2>
          <p>
            Refunds are processed by our payment provider and Merchant of Record, Paddle. To request
            a refund, visit{" "}
            <a
              href="https://paddle.net"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              paddle.net
            </a>{" "}
            and look up your order, or contact us via the Feedback page and we'll help you through
            the process.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">Cancellations</h2>
          <p>
            You can cancel your subscription any time from the Plans page. Cancellation stops
            future charges; your access continues until the end of the current billing period.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-2">Questions</h2>
          <p>
            For anything related to billing or refunds, reach out via the Feedback page or through
            Paddle's buyer support at paddle.net.
          </p>
        </section>
      </div>
    </main>
  );
}
