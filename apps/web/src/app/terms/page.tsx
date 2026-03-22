import { Nav } from "@/components/nav";

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="container max-w-3xl pt-24 pb-16">
        <h1 className="text-3xl font-bold mb-8">Terms of Use</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: March 22, 2026</p>

          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Soundril, you agree to be bound by these Terms of Use.
              If you do not agree, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Service Description</h2>
            <p>
              Soundril provides AI-powered audio processing tools including vocal/instrumental
              separation (MR extraction) and synchronized lyrics (LRC) generation. Results may
              vary depending on audio quality and content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. User Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must have the right to upload and process the audio files you submit</li>
              <li>You are responsible for ensuring your use complies with applicable copyright laws</li>
              <li>You must not use the service for any illegal or unauthorized purpose</li>
              <li>You must not attempt to abuse, exploit, or overload our systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Subscriptions & Minutes</h2>
            <p>
              Paid subscriptions provide a monthly allocation of processing minutes. Unused minutes
              do not roll over to the next billing period. Subscriptions renew automatically unless
              cancelled before the renewal date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Free Tier</h2>
            <p>
              Free accounts receive 10 minutes upon signup. Free users can preview results but
              cannot download full files. Downloads require an active paid subscription.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Refund Policy</h2>
            <p>
              We provide free previews to let you fully evaluate our service before purchasing.
              The processing quality on free and paid versions is the same. Please use the free
              version before subscribing to ensure you are satisfied with the quality.
            </p>
            <p className="font-medium text-foreground mt-3">We provide a full refund in the following cases:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                You constantly encounter an error preventing you from using our service, and we
                fail to fix it within 30 days (provided our team receives all requested information
                such as screenshots and file samples).
              </li>
              <li>You accidentally purchased the same subscription more than once and minutes were not used.</li>
            </ul>
            <p className="font-medium text-foreground mt-3">We reserve the right to decline refunds in the following cases:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Cancellation without a specific reason after minutes have been used.</li>
              <li>Expectation of features not stated on our website.</li>
              <li>Processing a file in full means agreeing with the quality provided by the preview.</li>
            </ul>
            <p className="mt-3">
              If you are having an issue, please contact our support team at{" "}
              <a href="mailto:help@soundril.com" className="text-primary hover:underline">
                help@soundril.com
              </a>{" "}
              before requesting a refund. We respond within 24 to 48 hours.
            </p>
            <p>
              Once a refund is processed, you will no longer be able to use the associated subscription.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Intellectual Property</h2>
            <p>
              You retain all rights to the audio files you upload and the results generated.
              Soundril does not claim ownership of your content. Our service, branding, and
              technology remain our intellectual property.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Limitation of Liability</h2>
            <p>
              Soundril is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for
              any indirect, incidental, or consequential damages arising from the use of our
              services. Our total liability shall not exceed the amount you paid in the last
              12 months.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account if you violate these terms.
              You may cancel your account at any time from your dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:help@soundril.com" className="text-primary hover:underline">
                help@soundril.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
