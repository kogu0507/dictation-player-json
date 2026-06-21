export type WakeLockCapability =
  | "available"
  | "insecure-context"
  | "unsupported";

export type WakeLockRequestResult =
  | "acquired"
  | "insecure-context"
  | "unsupported"
  | "failed"
  | "interrupted";

export type ExamInterruptionReason =
  | "document-hidden"
  | "wake-lock-released";

export interface WakeLockSentinelLike {
  released: boolean;
  release(): Promise<void>;
  addEventListener(
    type: "release",
    listener: () => void,
    options?: AddEventListenerOptions,
  ): void;
  removeEventListener(type: "release", listener: () => void): void;
}

export interface WakeLockManagerLike {
  request(type: "screen"): Promise<WakeLockSentinelLike>;
}

export interface VisibilityDocumentLike {
  readonly hidden: boolean;
  addEventListener(
    type: "visibilitychange",
    listener: () => void,
  ): void;
  removeEventListener(
    type: "visibilitychange",
    listener: () => void,
  ): void;
}

export interface ExamWakeLockEnvironment {
  secureContext: boolean;
  wakeLock?: WakeLockManagerLike;
  document: VisibilityDocumentLike;
}

export class ExamWakeLockController {
  private sentinel: WakeLockSentinelLike | undefined;
  private active = false;
  private interruptionHandled = false;
  private onInterrupted:
    | ((reason: ExamInterruptionReason) => void)
    | undefined;

  constructor(
    private readonly environment: ExamWakeLockEnvironment =
      createBrowserEnvironment(),
  ) {}

  get capability(): WakeLockCapability {
    if (!this.environment.secureContext) {
      return "insecure-context";
    }
    return this.environment.wakeLock === undefined
      ? "unsupported"
      : "available";
  }

  get isHeld(): boolean {
    return this.sentinel !== undefined && !this.sentinel.released;
  }

  async acquire(
    onInterrupted: (reason: ExamInterruptionReason) => void,
  ): Promise<WakeLockRequestResult> {
    this.active = true;
    this.interruptionHandled = false;
    this.onInterrupted = onInterrupted;
    this.environment.document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );

    if (this.environment.document.hidden) {
      this.interrupt("document-hidden");
      return "interrupted";
    }

    const capability = this.capability;
    if (capability !== "available") {
      return capability;
    }

    try {
      const sentinel = await this.environment.wakeLock!.request("screen");
      if (!this.active || this.environment.document.hidden) {
        await sentinel.release();
        return "interrupted";
      }
      this.sentinel = sentinel;
      sentinel.addEventListener("release", this.handleRelease);
      return "acquired";
    } catch {
      return this.active ? "failed" : "interrupted";
    }
  }

  async release(): Promise<void> {
    this.active = false;
    this.interruptionHandled = false;
    this.onInterrupted = undefined;
    this.environment.document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );

    const sentinel = this.sentinel;
    this.sentinel = undefined;
    if (sentinel === undefined) {
      return;
    }
    sentinel.removeEventListener("release", this.handleRelease);
    if (!sentinel.released) {
      await sentinel.release();
    }
  }

  private readonly handleVisibilityChange = (): void => {
    if (this.active && this.environment.document.hidden) {
      this.interrupt("document-hidden");
    }
  };

  private readonly handleRelease = (): void => {
    this.sentinel = undefined;
    if (this.active) {
      this.interrupt("wake-lock-released");
    }
  };

  private interrupt(reason: ExamInterruptionReason): void {
    if (!this.active || this.interruptionHandled) {
      return;
    }
    this.interruptionHandled = true;
    const callback = this.onInterrupted;
    void this.release();
    callback?.(reason);
  }
}

function createBrowserEnvironment(): ExamWakeLockEnvironment {
  const navigatorWithWakeLock = navigator as Navigator & {
    wakeLock?: WakeLockManagerLike;
  };
  return {
    secureContext: window.isSecureContext,
    wakeLock: navigatorWithWakeLock.wakeLock,
    document,
  };
}
