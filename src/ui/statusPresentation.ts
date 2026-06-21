export type AppStatusKind =
  | "loading"
  | "preparing"
  | "ready"
  | "playing"
  | "waiting"
  | "completed"
  | "stopped"
  | "error";

export interface StatusPresentation {
  label: string;
  role: "status" | "alert";
  ariaLive: "polite" | "assertive";
  busy: boolean;
}

const PRESENTATIONS: Record<AppStatusKind, StatusPresentation> = {
  loading: {
    label: "読み込み中",
    role: "status",
    ariaLive: "polite",
    busy: true,
  },
  preparing: {
    label: "準備中",
    role: "status",
    ariaLive: "polite",
    busy: true,
  },
  ready: {
    label: "準備完了",
    role: "status",
    ariaLive: "polite",
    busy: false,
  },
  playing: {
    label: "再生中",
    role: "status",
    ariaLive: "polite",
    busy: true,
  },
  waiting: {
    label: "待機中",
    role: "status",
    ariaLive: "polite",
    busy: true,
  },
  completed: {
    label: "終了",
    role: "status",
    ariaLive: "polite",
    busy: false,
  },
  stopped: {
    label: "中止",
    role: "status",
    ariaLive: "polite",
    busy: false,
  },
  error: {
    label: "エラー",
    role: "alert",
    ariaLive: "assertive",
    busy: false,
  },
};

export function getStatusPresentation(
  kind: AppStatusKind,
): StatusPresentation {
  return PRESENTATIONS[kind];
}
