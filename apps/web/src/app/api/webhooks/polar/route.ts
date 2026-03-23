import { NextResponse, type NextRequest } from "next/server";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { getPlanFromProductId } from "@/lib/polar";
import {
  activateSubscription,
  renewSubscription,
  cancelSubscription,
  uncancelSubscription,
  expireSubscription,
} from "@/lib/subscription";
import { adminDb } from "@/lib/firebase/server";
import { sendSubscriptionEmail, sendCancellationEmail, sendPaymentFailedEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("POLAR_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(body, Object.fromEntries(request.headers), webhookSecret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    throw error;
  }

  try {
    switch (event.type) {
      case "subscription.created":
      case "subscription.updated":
      case "subscription.active": {
        const sub = event.data;
        const firebaseUid = sub.metadata?.firebaseUid as string | undefined;
        if (!firebaseUid) {
          console.error("No firebaseUid in subscription metadata", sub.id);
          break;
        }

        const plan = getPlanFromProductId(sub.productId);
        if (!plan) {
          console.error("Unknown product ID", sub.productId);
          break;
        }

        if (sub.status === "active") {
          const existingUser = await adminDb.collection("users").doc(firebaseUid).get();
          const existingSub = existingUser.data()?.subscription;

          const periodStart = sub.currentPeriodStart instanceof Date
            ? sub.currentPeriodStart.toISOString()
            : String(sub.currentPeriodStart);
          const periodEnd = sub.currentPeriodEnd instanceof Date
            ? sub.currentPeriodEnd.toISOString()
            : sub.currentPeriodEnd ? String(sub.currentPeriodEnd) : "";

          if (
            existingSub?.polarSubscriptionId === sub.id &&
            existingSub?.currentPeriodStart === periodStart &&
            existingSub?.productId === sub.productId
          ) {
            // 같은 구독, 같은 기간, 같은 상품 → 중복 이벤트 무시
            break;
          }

          if (existingSub?.polarSubscriptionId === sub.id) {
            // 같은 구독, 다른 기간 또는 상품 변경 → 갱신
            await renewSubscription(firebaseUid, plan, periodStart, periodEnd, sub.productId);
          } else {
            const existingProductId = existingUser.data()?.subscription?.productId;
            const existingPlan = existingProductId ? getPlanFromProductId(existingProductId) : null;
            const isSamePlan = existingPlan === plan;

            // 구독 정보 업데이트 (같은 플랜 내 주기 변경이면 크레딧 미지급)
            await activateSubscription(firebaseUid, plan, {
              polarSubscriptionId: sub.id,
              polarCustomerId: sub.customerId,
              productId: sub.productId,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              status: sub.status,
            }, isSamePlan);

            // 신규 구독 또는 플랜 업그레이드 시에만 메일 발송
            if (!isSamePlan) {
              const userData = existingUser.data();
              if (userData?.email) {
                const isYearly = (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) > 60 * 24 * 60 * 60 * 1000;
                const credits = plan === "basic" ? (isYearly ? 1200 : 100) : (isYearly ? 3600 : 300);
                sendSubscriptionEmail({
                  to: userData.email,
                  name: userData.displayName || "",
                  plan,
                  credits,
                }).catch((err) => console.error("Subscription email failed:", err));
              }
            }
          }
        }
        break;
      }

      case "subscription.past_due": {
        const sub = event.data;
        const firebaseUid = sub.metadata?.firebaseUid as string | undefined;
        if (firebaseUid) {
          const userData = (await adminDb.collection("users").doc(firebaseUid).get()).data();
          if (userData?.email) {
            sendPaymentFailedEmail({
              to: userData.email,
              name: userData.displayName || "",
            }).catch((err) => console.error("Payment failed email error:", err));
          }
        }
        break;
      }

      case "subscription.canceled": {
        const sub = event.data;
        const firebaseUid = sub.metadata?.firebaseUid as string | undefined;
        if (firebaseUid) {
          await cancelSubscription(firebaseUid);

          // 취소 확인 메일
          const userData = (await adminDb.collection("users").doc(firebaseUid).get()).data();
          if (userData?.email) {
            const endDate = sub.currentPeriodEnd instanceof Date
              ? sub.currentPeriodEnd.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
              : String(sub.currentPeriodEnd ?? "");
            sendCancellationEmail({
              to: userData.email,
              name: userData.displayName || "",
              endDate,
            }).catch((err) => console.error("Cancellation email failed:", err));
          }
        }
        break;
      }

      case "subscription.uncanceled": {
        const sub = event.data;
        const firebaseUid = sub.metadata?.firebaseUid as string | undefined;
        if (firebaseUid) {
          await uncancelSubscription(firebaseUid);
        }
        break;
      }

      case "subscription.revoked": {
        const sub = event.data;
        const firebaseUid = sub.metadata?.firebaseUid as string | undefined;
        if (firebaseUid) {
          await expireSubscription(firebaseUid);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
