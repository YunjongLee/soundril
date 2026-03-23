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
  getCreditsForProduct,
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

          // pendingUpdate 처리
          const pending = "pendingUpdate" in sub && sub.pendingUpdate
            ? {
                productId: (sub.pendingUpdate as { productId?: string | null }).productId ?? null,
                appliesAt: (sub.pendingUpdate as { appliesAt?: Date | string }).appliesAt instanceof Date
                  ? (sub.pendingUpdate as { appliesAt: Date }).appliesAt.toISOString()
                  : String((sub.pendingUpdate as { appliesAt?: string }).appliesAt ?? ""),
              }
            : null;

          // Firestore에 pendingUpdate 저장/제거
          if (existingSub) {
            await adminDb.collection("users").doc(firebaseUid).update({
              "subscription.pendingUpdate": pending,
            });
          }

          if (
            existingSub?.polarSubscriptionId === sub.id &&
            existingSub?.currentPeriodStart === periodStart &&
            existingSub?.productId === sub.productId
          ) {
            // 같은 구독, 같은 기간, 같은 상품 → pendingUpdate만 업데이트하고 종료
            break;
          }

          if (existingSub?.polarSubscriptionId === sub.id) {
            // 같은 구독, 다른 기간 또는 상품 변경 → 갱신
            await renewSubscription(firebaseUid, plan, periodStart, periodEnd, sub.productId);
          } else {
            // 이전 구독에서 이미 지급된 크레딧 계산
            const existingProductId = existingUser.data()?.subscription?.productId;
            const existingPlan = existingProductId ? getPlanFromProductId(existingProductId) : null;
            const existingSub2 = existingUser.data()?.subscription;
            const wasYearly = existingSub2?.currentPeriodStart && existingSub2?.currentPeriodEnd
              ? (new Date(existingSub2.currentPeriodEnd).getTime() - new Date(existingSub2.currentPeriodStart).getTime()) > 60 * 24 * 60 * 60 * 1000
              : false;
            const previousCredits = getCreditsForProduct(existingPlan, wasYearly);

            await activateSubscription(firebaseUid, plan, {
              polarSubscriptionId: sub.id,
              polarCustomerId: sub.customerId,
              productId: sub.productId,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              status: sub.status,
            }, previousCredits);

            const isYearly = (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) > 60 * 24 * 60 * 60 * 1000;
            const totalCredits = plan === "basic" ? (isYearly ? 1200 : 100) : (isYearly ? 3600 : 300);
            const creditsGranted = Math.max(0, totalCredits - previousCredits);

            // 크레딧이 추가 지급된 경우에만 메일 발송
            if (creditsGranted > 0 && existingPlan !== plan) {
              const userData = existingUser.data();
              if (userData?.email) {
                sendSubscriptionEmail({
                  to: userData.email,
                  name: userData.displayName || "",
                  plan,
                  credits: totalCredits,
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
