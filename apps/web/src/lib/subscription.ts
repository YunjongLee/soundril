import { adminDb } from "./firebase/server";
import { FieldValue } from "firebase-admin/firestore";

const PLAN_CREDITS: Record<string, number> = {
  basic: 100,
  pro: 300,
};

/**
 * 구독 활성화 시 유저 문서 업데이트 + 크레딧 지급.
 */
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
  }
) {
  const credits = PLAN_CREDITS[plan] ?? 0;
  const userRef = adminDb.collection("users").doc(firebaseUid);

  await adminDb.runTransaction(async (tx) => {
    tx.update(userRef, {
      plan,
      subscription: {
        polarSubscriptionId: subscription.polarSubscriptionId,
        polarCustomerId: subscription.polarCustomerId,
        productId: subscription.productId,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        status: subscription.status,
      },
      credits: FieldValue.increment(credits),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 크레딧 지급 기록
    const txRef = adminDb.collection("creditTransactions").doc();
    tx.set(txRef, {
      userId: firebaseUid,
      type: "subscription_grant",
      amount: credits,
      jobId: null,
      description: `${plan} plan subscription - ${credits} credits`,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * 구독 갱신 시 크레딧 충전.
 */
export async function renewSubscription(
  firebaseUid: string,
  plan: string,
  currentPeriodStart: string,
  currentPeriodEnd: string
) {
  const credits = PLAN_CREDITS[plan] ?? 0;
  const userRef = adminDb.collection("users").doc(firebaseUid);

  await adminDb.runTransaction(async (tx) => {
    tx.update(userRef, {
      "subscription.currentPeriodStart": currentPeriodStart,
      "subscription.currentPeriodEnd": currentPeriodEnd,
      credits: FieldValue.increment(credits),
      updatedAt: FieldValue.serverTimestamp(),
    });

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
    plan: "free",
    subscription: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
