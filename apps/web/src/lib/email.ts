import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Soundril <no-reply@soundril.com>";

/**
 * 고객 문의 메일 (Help 페이지)
 */
export async function sendContactEmail({
  userEmail,
  subject,
  description,
}: {
  userEmail: string;
  subject: string;
  description: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: "help@soundril.com",
    replyTo: userEmail,
    subject: `[Contact] ${subject}`,
    html: `
      <p><strong>From:</strong> ${userEmail}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr />
      <p>${description.replace(/\n/g, "<br />")}</p>
    `,
  });
}

/**
 * 가입 환영 메일
 */
export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Soundril!",
    html: `
      <h2>Welcome to Soundril, ${name || "there"}!</h2>
      <p>Thanks for signing up. You've received <strong>10 free credits</strong> to get started.</p>
      <p>Here's what you can do:</p>
      <ul>
        <li><strong>AR → MR</strong> — Remove vocals and extract instrumentals</li>
        <li><strong>AR → LRC</strong> — Generate synchronized lyrics files</li>
      </ul>
      <p>
        <a href="https://soundril.com/dashboard" style="display:inline-block;background:#8249DF;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Go to Dashboard
        </a>
      </p>
      <p style="color:#888;font-size:12px;margin-top:24px;">
        If you have any questions, reply to this email or contact us at help@soundril.com
      </p>
    `,
  });
}

/**
 * 구독 확인 메일
 */
export async function sendSubscriptionEmail({
  to,
  name,
  plan,
  credits,
}: {
  to: string;
  name: string;
  plan: string;
  credits: number;
}) {
  const planName = plan === "basic" ? "Basic" : "Pro";

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your ${planName} subscription is active`,
    html: `
      <h2>You're on the ${planName} plan!</h2>
      <p>Hi ${name || "there"},</p>
      <p>Your subscription is now active. <strong>${credits} credits</strong> have been added to your account.</p>
      <p>
        <a href="https://soundril.com/dashboard" style="display:inline-block;background:#8249DF;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Start Processing
        </a>
      </p>
      <p>
        You can manage your subscription anytime from your
        <a href="https://soundril.com/dashboard/subscription">subscription settings</a>.
      </p>
      <p style="color:#888;font-size:12px;margin-top:24px;">
        If you have any questions, contact us at help@soundril.com
      </p>
    `,
  });
}

/**
 * 결제 실패 안내 메일
 */
export async function sendPaymentFailedEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Payment failed — please update your payment method",
    html: `
      <h2>Payment Failed</h2>
      <p>Hi ${name || "there"},</p>
      <p>We couldn't process your latest payment. Please update your payment method to keep your subscription active.</p>
      <p>
        <a href="https://soundril.com/dashboard/subscription" style="display:inline-block;background:#8249DF;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Update Payment Method
        </a>
      </p>
      <p style="color:#888;font-size:12px;margin-top:24px;">
        If you have any questions, contact us at help@soundril.com
      </p>
    `,
  });
}

/**
 * 구독 취소 확인 메일
 */
export async function sendCancellationEmail({
  to,
  name,
  endDate,
}: {
  to: string;
  name: string;
  endDate: string;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Your subscription has been canceled",
    html: `
      <h2>Subscription Canceled</h2>
      <p>Hi ${name || "there"},</p>
      <p>Your subscription has been canceled. You can continue using your current plan until <strong>${endDate}</strong>.</p>
      <p>Your credits will remain available until the end of your billing period.</p>
      <p>
        Changed your mind?
        <a href="https://soundril.com/dashboard/subscription">Reactivate your subscription</a>
      </p>
      <p style="color:#888;font-size:12px;margin-top:24px;">
        If you have any questions, contact us at help@soundril.com
      </p>
    `,
  });
}
