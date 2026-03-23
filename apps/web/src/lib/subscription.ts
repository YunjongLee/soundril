import { adminDb } from "./firebase/server";
import { FieldValue } from "firebase-admin/firestore";

const PLAN_CREDITS: Record<string, { monthly: number; yearly: number }> = {
  basic: { monthly: 100, yearly: 1200 },
  pro: { monthly: 300, yearly: 3600 },
};

/**
 * 구독 활성화 시 유저 문서 업데이트 + 크레딧 지급.
 */
/**
 * 기존에 지급된 크레딧 계산 (plan + period 기반)
 */
export function getCreditsForProduct(plan: string | null, isYearly: boolean): number {
  if (!plan) return 0;
  return PLAN_CREDITS[plan]?.[isYearly ? "yearly" : "monthly"] ?? 0;
}

export async function activateSubscription(
  firebaseUid: string,
  plan: string,
  subscription: {
    polarSubscriptionId: string;
    polarCustomerId: string;
    productId: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    status: string;
  },
  previousCreditsGranted = 0
) {
  const isYearly =
    new Date(subscription.currentPeriodEnd).getTime() -
    new Date(subscription.currentPeriodStart).getTime() >
    60 * 24 * 60 * 60 * 1000; // > 60 days
  const totalCredits = PLAN_CREDITS[plan]?.[isYearly ? "yearly" : "monthly"] ?? 0;
  const creditsToGrant = Math.max(0, totalCredits - previousCreditsGranted);
  const userRef = adminDb.collection("users").doc(firebaseUid);

  await adminDb.runTransaction(async (tx) => {
    const updateData: Record<string, unknown> = {
      subscription: {
        polarSubscriptionId: subscription.polarSubscriptionId,
        polarCustomerId: subscription.polarCustomerId,
        productId: subscription.productId,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        status: subscription.status,
      },
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (creditsToGrant > 0) {
      updateData.credits = FieldValue.increment(creditsToGrant);
    }

    tx.update(userRef, updateData);

    if (creditsToGrant > 0) {
      const txRef = adminDb.collection("creditTransactions").doc();
      tx.set(txRef, {
        userId: firebaseUid,
        type: "subscription_grant",
        amount: creditsToGrant,
        jobId: null,
        description: `${plan} plan subscription - ${creditsToGrant} credits`,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

/**
 * 구독 갱신 시 크레딧 충전.
 */
export async function renewSubscription(
  firebaseUid: string,
  plan: string,
  currentPeriodStart: string,
  currentPeriodEnd: string,
  productId?: string
) {
  const isYearly =
    new Date(currentPeriodEnd).getTime() -
    new Date(currentPeriodStart).getTime() >
    60 * 24 * 60 * 60 * 1000;
  const credits = PLAN_CREDITS[plan]?.[isYearly ? "yearly" : "monthly"] ?? 0;
  const userRef = adminDb.collection("users").doc(firebaseUid);

  await adminDb.runTransaction(async (tx) => {
    const updateData: Record<string, unknown> = {
      "subscription.currentPeriodStart": currentPeriodStart,
      "subscription.currentPeriodEnd": currentPeriodEnd,
      credits: FieldValue.increment(credits),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (productId) {
      updateData["subscription.productId"] = productId;
    }
    tx.update(userRef, updateData);

    const txRef = adminDb.collection("creditTransactions").doc();
    tx.set(txRef, {
      userId: firebaseUid,
      type: "subscription_grant",
      amount: credits,
      jobId: null,
      description: `${plan} plan renewal - ${credits} credits`,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * 구독 취소 시 유저 문서 업데이트.
 * 현재 기간 끝까지는 사용 가능 (크레딧 회수하지 않음).
 */
export async function cancelSubscription(firebaseUid: string) {
  const userRef = adminDb.collection("users").doc(firebaseUid);
  await userRef.update({
    "subscription.status": "canceled",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 구독 취소 철회 시 다시 active로 전환.
 */
export async function uncancelSubscription(firebaseUid: string) {
  const userRef = adminDb.collection("users").doc(firebaseUid);
  await userRef.update({
    "subscription.status": "active",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 구독 만료 시 free 플랜으로 전환.
 */
export async function expireSubscription(firebaseUid: string) {
  const userRef = adminDb.collection("users").doc(firebaseUid);
  await userRef.update({
    subscription: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
