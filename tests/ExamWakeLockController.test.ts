import { describe, expect, it, vi } from "vitest";
import {
  ExamWakeLockController,
  type VisibilityDocumentLike,
  type WakeLockSentinelLike,
} from "../src/platform/ExamWakeLockController";

class FakeSentinel implements WakeLockSentinelLike {
  released = false;
  release = vi.fn(async () => {
    if (this.released) {
      return;
    }
    this.released = true;
    this.releaseListener?.();
  });
  private releaseListener: (() => void) | undefined;

  addEventListener(
    _type: "release",
    listener: () => void,
  ): void {
    this.releaseListener = listener;
  }

  removeEventListener(
    _type: "release",
    listener: () => void,
  ): void {
    if (this.releaseListener === listener) {
      this.releaseListener = undefined;
    }
  }

  emitUnexpectedRelease(): void {
    this.released = true;
    this.releaseListener?.();
  }
}

class FakeVisibilityDocument implements VisibilityDocumentLike {
  hidden = false;
  private listener: (() => void) | undefined;

  addEventListener(
    _type: "visibilitychange",
    listener: () => void,
  ): void {
    this.listener = listener;
  }

  removeEventListener(
    _type: "visibilitychange",
    listener: () => void,
  ): void {
    if (this.listener === listener) {
      this.listener = undefined;
    }
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.listener?.();
  }
}

describe("ExamWakeLockController", () => {
  it("対応するsecure contextでscreen Wake Lockを取得・解放する", async () => {
    const sentinel = new FakeSentinel();
    const request = vi.fn().mockResolvedValue(sentinel);
    const controller = new ExamWakeLockController({
      secureContext: true,
      wakeLock: { request },
      document: new FakeVisibilityDocument(),
    });

    await expect(controller.acquire(vi.fn())).resolves.toBe("acquired");
    expect(request).toHaveBeenCalledWith("screen");
    expect(controller.isHeld).toBe(true);

    await controller.release();
    expect(sentinel.release).toHaveBeenCalledOnce();
    expect(controller.isHeld).toBe(false);
  });

  it.each([
    [false, undefined, "insecure-context"],
    [true, undefined, "unsupported"],
  ] as const)(
    "非対応環境を区別し、visibility監視は継続する",
    async (secureContext, wakeLock, expected) => {
      const document = new FakeVisibilityDocument();
      const onInterrupted = vi.fn();
      const controller = new ExamWakeLockController({
        secureContext,
        wakeLock,
        document,
      });

      await expect(controller.acquire(onInterrupted)).resolves.toBe(
        expected,
      );
      document.setHidden(true);
      expect(onInterrupted).toHaveBeenCalledWith("document-hidden");
    },
  );

  it("取得失敗を返し、練習モードを阻害する例外を投げない", async () => {
    const controller = new ExamWakeLockController({
      secureContext: true,
      wakeLock: {
        request: vi.fn().mockRejectedValue(new Error("denied")),
      },
      document: new FakeVisibilityDocument(),
    });

    await expect(controller.acquire(vi.fn())).resolves.toBe("failed");
  });

  it("document hiddenで中断通知し、復帰時に再取得しない", async () => {
    const document = new FakeVisibilityDocument();
    const sentinel = new FakeSentinel();
    const request = vi.fn().mockResolvedValue(sentinel);
    const onInterrupted = vi.fn();
    const controller = new ExamWakeLockController({
      secureContext: true,
      wakeLock: { request },
      document,
    });
    await controller.acquire(onInterrupted);

    document.setHidden(true);
    await Promise.resolve();
    expect(onInterrupted).toHaveBeenCalledOnce();
    expect(onInterrupted).toHaveBeenCalledWith("document-hidden");
    expect(sentinel.release).toHaveBeenCalledOnce();

    document.setHidden(false);
    expect(request).toHaveBeenCalledOnce();
  });

  it("予期しないreleaseイベントで中断通知する", async () => {
    const sentinel = new FakeSentinel();
    const onInterrupted = vi.fn();
    const controller = new ExamWakeLockController({
      secureContext: true,
      wakeLock: {
        request: vi.fn().mockResolvedValue(sentinel),
      },
      document: new FakeVisibilityDocument(),
    });
    await controller.acquire(onInterrupted);

    sentinel.emitUnexpectedRelease();
    expect(onInterrupted).toHaveBeenCalledWith("wake-lock-released");
    expect(controller.isHeld).toBe(false);
  });

  it("明示releaseのreleaseイベントは中断通知しない", async () => {
    const sentinel = new FakeSentinel();
    const onInterrupted = vi.fn();
    const controller = new ExamWakeLockController({
      secureContext: true,
      wakeLock: {
        request: vi.fn().mockResolvedValue(sentinel),
      },
      document: new FakeVisibilityDocument(),
    });
    await controller.acquire(onInterrupted);

    await controller.release();
    expect(onInterrupted).not.toHaveBeenCalled();
  });

  it("取得待ち中に解放された場合は、後から取得したsentinelを即時解放する", async () => {
    const sentinel = new FakeSentinel();
    let resolveRequest:
      | ((sentinel: WakeLockSentinelLike) => void)
      | undefined;
    const request = vi.fn(
      () =>
        new Promise<WakeLockSentinelLike>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const onInterrupted = vi.fn();
    const controller = new ExamWakeLockController({
      secureContext: true,
      wakeLock: { request },
      document: new FakeVisibilityDocument(),
    });

    const acquiring = controller.acquire(onInterrupted);
    await controller.release();
    resolveRequest?.(sentinel);

    await expect(acquiring).resolves.toBe("interrupted");
    expect(sentinel.release).toHaveBeenCalledOnce();
    expect(onInterrupted).not.toHaveBeenCalled();
  });
});
