export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowGeometry {
  position: WindowPosition;
  size: WindowSize;
}

export interface Bounds {
  width: number;
  height: number;
}

export type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function clampGeometry(geometry: WindowGeometry, bounds: Bounds): WindowGeometry {
  const width = Math.min(geometry.size.width, bounds.width);
  const height = Math.min(geometry.size.height, bounds.height);
  const maxX = Math.max(0, bounds.width - width);
  const maxY = Math.max(0, bounds.height - height);
  const x = clampNumber(geometry.position.x, 0, maxX);
  const y = clampNumber(geometry.position.y, 0, maxY);
  return {
    position: { x, y },
    size: { width, height }
  };
}

export function moveGeometry(
  start: WindowGeometry,
  delta: { dx: number; dy: number },
  bounds: Bounds
): WindowGeometry {
  const geometry: WindowGeometry = {
    position: {
      x: start.position.x + delta.dx,
      y: start.position.y + delta.dy
    },
    size: { ...start.size }
  };

  return clampGeometry(geometry, bounds);
}

function clampSize(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }
  return clampNumber(value, min, max);
}

export function resizeGeometry(
  direction: ResizeDirection,
  start: WindowGeometry,
  delta: { dx: number; dy: number },
  bounds: Bounds,
  minSize: WindowSize
): WindowGeometry {
  let { x, y } = start.position;
  let { width, height } = start.size;

  const maxWidth = bounds.width - x;
  const maxHeight = bounds.height - y;

  if (direction.includes("e")) {
    width = clampSize(width + delta.dx, minSize.width, maxWidth);
  }

  if (direction.includes("s")) {
    height = clampSize(height + delta.dy, minSize.height, maxHeight);
  }

  if (direction.includes("w")) {
    let nextX = x + delta.dx;
    const minX = Math.max(0, x + width - bounds.width);
    const maxX = x + width - minSize.width;
    nextX = clampNumber(nextX, minX, maxX);
    const nextWidth = width + (x - nextX);
    x = nextX;
    width = clampSize(nextWidth, minSize.width, bounds.width - x);
  }

  if (direction.includes("n")) {
    let nextY = y + delta.dy;
    const minY = Math.max(0, y + height - bounds.height);
    const maxY = y + height - minSize.height;
    nextY = clampNumber(nextY, minY, maxY);
    const nextHeight = height + (y - nextY);
    y = nextY;
    height = clampSize(nextHeight, minSize.height, bounds.height - y);
  }

  return clampGeometry(
    {
      position: { x, y },
      size: { width, height }
    },
    bounds
  );
}

