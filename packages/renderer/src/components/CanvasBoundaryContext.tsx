import { createContext, type MutableRefObject, useContext } from "react";

export interface CanvasBoundaryContextValue {
  /**
   * Latest measured bounds for the canvas container. The values are
   * expressed in viewport coordinates as returned by `getBoundingClientRect`.
   */
  readonly bounds: DOMRectReadOnly | null;

  /**
   * Requests an explicit re-measure of the canvas container bounds.
   */
  readonly refreshBounds: () => void;

  /**
   * Stable ref that points at the overlay element rendered above the canvas.
   * Consumers can portal into this element so their absolute positioning is
   * applied in the same coordinate space as the canvas contents.
   */
  readonly overlayRef: MutableRefObject<HTMLDivElement | null>;
}

const CanvasBoundaryContext = createContext<CanvasBoundaryContextValue | null>(null);

export const CanvasBoundaryProvider = CanvasBoundaryContext.Provider;

export function useCanvasBoundary(): CanvasBoundaryContextValue {
  const context = useContext(CanvasBoundaryContext);
  if (!context) {
    throw new Error("useCanvasBoundary must be used within a CanvasBoundaryProvider");
  }
  return context;
}

