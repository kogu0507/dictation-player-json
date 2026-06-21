import type {
  WakeLockCapability,
  WakeLockRequestResult,
} from "../platform/ExamWakeLockController";

export function getWakeLockGuidance(
  state: WakeLockCapability | WakeLockRequestResult,
): string | undefined {
  if (state === "insecure-context") {
    return "画面消灯防止にはHTTPS環境が必要です。試験中は端末の自動ロックを一時的に無効化し、画面を表示したまま使用してください。";
  }
  if (state === "unsupported") {
    return "このブラウザは画面消灯防止に対応していません。試験中は端末の自動ロックを一時的に無効化し、画面を表示したまま使用してください。";
  }
  if (state === "failed") {
    return "画面消灯防止を開始できませんでした。試験中は端末の自動ロックを一時的に無効化し、画面を表示したまま使用してください。";
  }
  return undefined;
}
