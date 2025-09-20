import { describe, expect, it } from "vitest";
import {
  clampGeometry,
  moveGeometry,
  resizeGeometry,
  type WindowGeometry
} from "../contextWindowUtils";

const bounds = { width: 800, height: 600 } as const;
const minSize = { width: 200, height: 160 } as const;

describe("contextWindowUtils", () => {
  const baseGeometry: WindowGeometry = {
    position: { x: 100, y: 120 },
    size: { width: 320, height: 240 }
  };

  it("clamps geometry within bounds", () => {
    const geometry: WindowGeometry = {
      position: { x: 700, y: 500 },
      size: { width: 240, height: 200 }
    };

    const result = clampGeometry(geometry, bounds);

    expect(result.position.x).toBeLessThanOrEqual(bounds.width - result.size.width);
    expect(result.position.y).toBeLessThanOrEqual(bounds.height - result.size.height);
    expect(result.position.x).toBeGreaterThanOrEqual(0);
    expect(result.position.y).toBeGreaterThanOrEqual(0);
  });

  it("limits movement to the canvas", () => {
    const result = moveGeometry(baseGeometry, { dx: 900, dy: 900 }, bounds);
    expect(result.position.x).toBe(bounds.width - baseGeometry.size.width);
    expect(result.position.y).toBe(bounds.height - baseGeometry.size.height);
  });

  it("respects minimum size when resizing from the east edge", () => {
    const result = resizeGeometry("e", baseGeometry, { dx: -1000, dy: 0 }, bounds, minSize);
    expect(result.size.width).toBe(minSize.width);
    expect(result.position.x).toBe(baseGeometry.position.x);
  });

  it("respects bounds when resizing from the south edge", () => {
    const result = resizeGeometry("s", baseGeometry, { dx: 0, dy: 1000 }, bounds, minSize);
    expect(result.size.height).toBe(bounds.height - baseGeometry.position.y);
  });

  it("adjusts position when resizing from the west edge", () => {
    const result = resizeGeometry("w", baseGeometry, { dx: -80, dy: 0 }, bounds, minSize);
    expect(result.position.x).toBe(baseGeometry.position.x - 80);
    expect(result.size.width).toBe(baseGeometry.size.width + 80);
  });

  it("prevents resizing beyond the northern boundary", () => {
    const result = resizeGeometry("n", baseGeometry, { dx: 0, dy: -500 }, bounds, minSize);
    expect(result.position.y).toBe(0);
    expect(result.size.height).toBeGreaterThanOrEqual(minSize.height);
  });
});

