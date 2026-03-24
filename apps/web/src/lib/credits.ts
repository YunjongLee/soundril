import { adminDb } from "./firebase/server";
import { FieldValue } from "firebase-admin/firestore";

export type TransactionType =
  | "signup_bonus"
  | "subscription_grant"
  | "job_charge"
  | "job_refund"
  | "admin_grant"
  | "admin_deduction";

/**
 * 분 필요량 계산.
 * MR: 1분/분, LRC(보컬추출 없음): 1분/분, LRC+보컬추출: 1.5분/분
 */
export function calculateCredits(
  durationSeconds: number,
  type: "mr" | "lrc" | "lrc_mr"
): number {
  const minutes = Math.ceil(durationSeconds / 60);
  if (type === "lrc_mr") return Math.ceil(minutes * 1.5);
  return minutes;
}

/**
 * 크레딧 차감 (Firestore 트랜잭션).
 * 잔액 부족 시 에러.
 */
export async function chargeCredits(
  userId: string,
  amount: number,
  jobId: string,
  description: string
) {
  return adminDb.runTransaction(async (tx) => {
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await tx.get(userRef);

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const currentCredits = userDoc.data()!.credits as number;
    if (currentCredits < amount) {
      throw new Error(
        `Insufficient credits: ${currentCredits} available, ${amount} required`
      );
    }

    const newBalance = currentCredits - amount;

    // 유저 크레딧 차감
    tx.update(userRef, {
      credits: newBalance,
      totalCreditsUsed: FieldValue.increment(amount),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 트랜잭션 기록
    const txRef = adminDb.collection("creditTransactions").doc();
    tx.set(txRef, {
      userId,
      type: "job_charge" as TransactionType,
      amount: -amount,
      balanceBefore: currentCredits,
      balanceAfter: newBalance,
      jobId,
      description,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { balanceBefore: currentCredits, balanceAfter: newBalance };
  });
}

/**
 * 크레딧 환불 (작업 실패/취소 시).
 */
export async function refundCredits(
  userId: string,
  amount: number,
  jobId: string,
  description: string
) {
  return adminDb.runTransaction(async (tx) => {
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await tx.get(userRef);

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const currentCredits = userDoc.data()!.credits as number;
    const newBalance = currentCredits + amount;

    tx.update(userRef, {
      credits: newBalance,
      totalCreditsUsed: FieldValue.increment(-amount),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const txRef = adminDb.collection("creditTransactions").doc();
    tx.set(txRef, {
      userId,
      type: "job_refund" as TransactionType,
      amount: amount,
      balanceBefore: currentCredits,
      balanceAfter: newBalance,
      jobId,
      description,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { balanceBefore: currentCredits, balanceAfter: newBalance };
  });
}

/**
 * Admin 크레딧 수동 조정 (grant or deduction).
 * amount > 0 → grant, amount < 0 → deduction.
 */
export async function adminAdjustCredits(
  userId: string,
  amount: number,
  description: string
) {
  return adminDb.runTransaction(async (tx) => {
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await tx.get(userRef);

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const currentCredits = userDoc.data()!.credits as number;
    const newBalance = currentCredits + amount;

    if (newBalance < 0) {
      throw new Error(
        `Insufficient credits: ${currentCredits} available, cannot deduct ${Math.abs(amount)}`
      );
    }

    tx.update(userRef, {
      credits: newBalance,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const txRef = adminDb.collection("creditTransactions").doc();
    tx.set(txRef, {
      userId,
      type: (amount > 0 ? "admin_grant" : "admin_deduction") as TransactionType,
      amount,
      balanceBefore: currentCredits,
      balanceAfter: newBalance,
      jobId: null,
      description,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { balanceBefore: currentCredits, balanceAfter: newBalance };
  });
}

/**
 * 가입 보너스 크레딧 지급 (10크레딧).
 */
export async function grantSignupBonus(userId: string) {
  const SIGNUP_BONUS = 10;

  const userRef = adminDb.collection("users").doc(userId);
  const txRef = adminDb.collection("creditTransactions").doc();

  await adminDb.runTransaction(async (tx) => {
    tx.update(userRef, {
      credits: FieldValue.increment(SIGNUP_BONUS),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.set(txRef, {
      userId,
      type: "signup_bonus" as TransactionType,
      amount: SIGNUP_BONUS,
      balanceBefore: 0,
      balanceAfter: SIGNUP_BONUS,
      jobId: null,
      description: "Sign-up bonus",
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}
