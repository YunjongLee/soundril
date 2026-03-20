import { getApps } from "firebase-admin/app";
import { applicationDefault } from "firebase-admin/app";

/**
 * Cloud Tasks로 오디오 처리 작업 생성.
 * vividvows의 cloudTasks.ts 패턴 참고.
 */
export async function createProcessingTask(payload: {
  jobId: string;
  userId: string;
  type: "mr" | "lrc" | "lrc_mr";
  inputStoragePath: string;
  language?: string;
  lyrics?: string;
}) {
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION || "asia-northeast3";
  const queue = process.env.CLOUD_TASKS_QUEUE || "audio-processing";
  const processorUrl = process.env.AUDIO_PROCESSOR_URL;
  const secret = process.env.AUDIO_PROCESSOR_SECRET;

  if (!projectId || !processorUrl || !secret) {
    throw new Error("Missing Cloud Tasks configuration");
  }

  // Get access token from default credentials or firebase-admin
  const app = getApps()[0];
  const credential = app?.options?.credential || applicationDefault();
  const token = await (credential as { getAccessToken: () => Promise<{ access_token: string }> }).getAccessToken();

  const url = `https://cloudtasks.googleapis.com/v2/projects/${projectId}/locations/${location}/queues/${queue}/tasks`;

  const body = {
    task: {
      httpRequest: {
        httpMethod: "POST",
        url: `${processorUrl}/process`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
      },
      dispatchDeadline: "1800s", // 30 minutes
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloud Task creation failed: ${response.status} ${error}`);
  }

  return await response.json();
}
