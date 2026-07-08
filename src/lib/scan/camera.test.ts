import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CAMERA_CONSTRAINTS,
  blobToFile,
  classifyCameraError,
  focusAtPoint,
  isCameraCaptureSupported,
  scanFileName,
  stopStream,
} from "./camera";

describe("isCameraCaptureSupported", () => {
  const original = globalThis.navigator;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (original) vi.stubGlobal("navigator", original);
  });

  it("is true when navigator.mediaDevices.getUserMedia exists", () => {
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: () => {} },
    });
    expect(isCameraCaptureSupported()).toBe(true);
  });

  it("is false when mediaDevices is absent", () => {
    vi.stubGlobal("navigator", {});
    expect(isCameraCaptureSupported()).toBe(false);
  });

  it("is false when getUserMedia is not a function", () => {
    vi.stubGlobal("navigator", { mediaDevices: {} });
    expect(isCameraCaptureSupported()).toBe(false);
  });
});

describe("classifyCameraError", () => {
  it("maps a permission denial to `denied`", () => {
    expect(classifyCameraError({ name: "NotAllowedError" }).kind).toBe(
      "denied",
    );
    expect(classifyCameraError({ name: "SecurityError" }).kind).toBe("denied");
  });

  it("maps a missing device to `no-camera`", () => {
    expect(classifyCameraError({ name: "NotFoundError" }).kind).toBe(
      "no-camera",
    );
    expect(classifyCameraError({ name: "OverconstrainedError" }).kind).toBe(
      "no-camera",
    );
  });

  it("maps a busy device to `in-use`", () => {
    expect(classifyCameraError({ name: "NotReadableError" }).kind).toBe(
      "in-use",
    );
    expect(classifyCameraError({ name: "AbortError" }).kind).toBe("in-use");
  });

  it("falls back to `unknown` for unrecognised or malformed errors", () => {
    expect(classifyCameraError({ name: "WeirdError" }).kind).toBe("unknown");
    expect(classifyCameraError(new Error("boom")).kind).toBe("unknown");
    expect(classifyCameraError(null).kind).toBe("unknown");
    expect(classifyCameraError("string error").kind).toBe("unknown");
  });

  it("always returns a non-empty user-facing message", () => {
    for (const name of [
      "NotAllowedError",
      "NotFoundError",
      "NotReadableError",
      "Whatever",
    ]) {
      expect(classifyCameraError({ name }).message.length).toBeGreaterThan(0);
    }
  });
});

describe("CAMERA_CONSTRAINTS", () => {
  it("prefers the rear (environment) camera without hard-requiring it", () => {
    const video = CAMERA_CONSTRAINTS.video as MediaTrackConstraints;
    expect(video.facingMode).toEqual({ ideal: "environment" });
    expect(CAMERA_CONSTRAINTS.audio).toBe(false);
  });
});

describe("scanFileName", () => {
  it("uses a .jpg extension by default", () => {
    expect(scanFileName()).toMatch(/^label-\d+\.jpg$/);
  });

  it("uses .png when the mime is image/png", () => {
    expect(scanFileName("image/png")).toMatch(/^label-\d+\.png$/);
  });
});

describe("blobToFile", () => {
  it("wraps a blob as a named File carrying its type", () => {
    const blob = new Blob(["x"], { type: "image/jpeg" });
    const file = blobToFile(blob, "label-1.jpg");
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("label-1.jpg");
    expect(file.type).toBe("image/jpeg");
  });

  it("generates a name when none is given", () => {
    const file = blobToFile(new Blob(["x"], { type: "image/jpeg" }));
    expect(file.name).toMatch(/^label-\d+\.jpg$/);
  });
});

describe("focusAtPoint", () => {
  it("returns false when the platform exposes no focus control", async () => {
    const track = { getCapabilities: () => ({}) };
    const stream = {
      getVideoTracks: () => [track],
    } as unknown as MediaStream;
    await expect(focusAtPoint(stream, 0.5, 0.5)).resolves.toBe(false);
  });

  it("returns false with no stream or no video track", async () => {
    await expect(focusAtPoint(null, 0.5, 0.5)).resolves.toBe(false);
    const empty = { getVideoTracks: () => [] } as unknown as MediaStream;
    await expect(focusAtPoint(empty, 0.5, 0.5)).resolves.toBe(false);
  });

  it("applies a single-shot focus at the clamped point where supported", async () => {
    const applyConstraints = vi.fn().mockResolvedValue(undefined);
    const track = {
      getCapabilities: () => ({ focusMode: ["single-shot", "continuous"] }),
      applyConstraints,
    };
    const stream = {
      getVideoTracks: () => [track],
    } as unknown as MediaStream;

    // y is out of range and must be clamped into [0, 1].
    await expect(focusAtPoint(stream, 0.25, 1.5)).resolves.toBe(true);
    expect(applyConstraints).toHaveBeenCalledWith({
      advanced: [
        {
          focusMode: "single-shot",
          pointsOfInterest: [{ x: 0.25, y: 1 }],
        },
      ],
    });
  });

  it("returns false when applyConstraints rejects", async () => {
    const track = {
      getCapabilities: () => ({ focusMode: ["continuous"] }),
      applyConstraints: vi.fn().mockRejectedValue(new Error("nope")),
    };
    const stream = {
      getVideoTracks: () => [track],
    } as unknown as MediaStream;
    await expect(focusAtPoint(stream, 0.5, 0.5)).resolves.toBe(false);
  });
});

describe("stopStream", () => {
  it("stops every track and tolerates null", () => {
    const stop = vi.fn();
    const stream = {
      getTracks: () => [{ stop }, { stop }],
    } as unknown as MediaStream;
    stopStream(stream);
    expect(stop).toHaveBeenCalledTimes(2);
    expect(() => stopStream(null)).not.toThrow();
    expect(() => stopStream(undefined)).not.toThrow();
  });
});
