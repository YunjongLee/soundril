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
  lyrics?: string;
  coverStoragePath?: string | null;
}) {
  const processorUrl = process.env.AUDIO_PROCESSOR_URL;
  const secret = process.env.AUDIO_PROCESSOR_SECRET;

  // Local development: call processor directly (skip Cloud Tasks)
  if (process.env.NODE_ENV === "development") {
    const localUrl = processorUrl || "http://localhost:8080";
    if (!secret) throw new Error("AUDIO_PROCESSOR_SECRET is not set");

    // Fire-and-forget (mimics Cloud Tasks async behavior)
    fetch(`${localUrl}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    }).catch((err) =>
      console.error("Local processor call failed:", err.message)
    );

    return { name: "local-dev-task" };
  }

  // Production: Cloud Tasks
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION || "asia-northeast3";
  const queue = process.env.CLOUD_TASKS_QUEUE || "audio-processing";

  if (!projectId || !processorUrl || !secret) {
    throw new Error("Missing Cloud Tasks configuration");
  }

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
