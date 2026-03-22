import { Nav } from "@/components/nav";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="container max-w-3xl pt-24 pb-16">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: March 22, 2026</p>

          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p>
              When you create an account, we collect your name, email address, and profile picture
              through Google Sign-In. When you use our services, we collect the audio files you
              upload and the lyrics you provide for processing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and maintain our audio processing services</li>
              <li>To process your uploaded audio files and generate results</li>
              <li>To manage your account and subscription</li>
              <li>To communicate with you about service updates</li>
              <li>To improve our services and develop new features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Data Storage & Retention</h2>
            <p>
              Your uploaded audio files and processing results are stored securely on Google Cloud
              Platform. Processed files are retained for 30 days after creation, after which they
              are automatically deleted. You may delete your files at any time from your dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Data Sharing</h2>
            <p>
              We do not sell, trade, or share your personal information or uploaded content with
              third parties. Your audio files are processed solely for the purpose of providing
              our services and are not used for any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Security</h2>
            <p>
              We implement industry-standard security measures including encrypted data
              transmission (HTTPS), secure cloud storage, and access controls to protect
              your information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management.
              We do not use tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Your Rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal data at any
              time by contacting us at{" "}
              <a href="mailto:help@soundril.com" className="text-primary hover:underline">
                help@soundril.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new policy on this page and updating the date above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{" "}
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
