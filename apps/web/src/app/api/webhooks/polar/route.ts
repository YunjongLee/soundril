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
            existingSub?.currentPeriodStart === periodStart
          ) {
            // 같은 구독, 같은 기간 → 중복 이벤트 무시
            break;
          }

          if (existingSub?.polarSubscriptionId === sub.id) {
            // 같은 구독, 다른 기간 → 갱신
            await renewSubscription(firebaseUid, plan, periodStart, periodEnd);
          } else {
            // 신규 구독
            await activateSubscription(firebaseUid, plan, {
              polarSubscriptionId: sub.id,
              polarCustomerId: sub.customerId,
              productId: sub.productId,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              status: sub.status,
            });
          }
        }
        break;
      }

      case "subscription.canceled": {
        const sub = event.data;
        const firebaseUid = sub.metadata?.firebaseUid as string | undefined;
        if (firebaseUid) {
          await cancelSubscription(firebaseUid);
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
