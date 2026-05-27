/**
 * 크레딧 계산 순수 함수.
 * firebase-admin 등 서버 전용 의존성이 없어 클라이언트 컴포넌트에서도 사용 가능.
 *
 * 단가:
 *   - Key Shift: 0.5분/분 (피치 시프트만, 분리 없음)
 *   - MR: 1분/분
 *   - LRC: 1분/분
 *   - LRC + MR: 1.5분/분
 * 모든 결과는 정수 크레딧으로 올림 처리.
 */
export function calculateCredits(
  durationSeconds: number,
  type: "mr" | "lrc" | "lrc_mr" | "key"
): number {
  const minutes = Math.ceil(durationSeconds / 60);
  if (type === "key") return Math.ceil(minutes * 0.5);
  if (type === "lrc_mr") return Math.ceil(minutes * 1.5);
  return minutes;
}
