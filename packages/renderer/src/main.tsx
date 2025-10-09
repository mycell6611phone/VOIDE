import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const globalWindow = typeof window !== "undefined" ? window : undefined;

if (globalWindow && typeof globalWindow.ResizeObserver === "undefined") {
  type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

  class ResizeObserverPolyfill implements ResizeObserver {
    private readonly callback: ResizeObserverCallback;
    private readonly targets = new Set<Element>();
    private readonly listener: () => void;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      this.listener = () => {
        const entries: ResizeObserverEntry[] = Array.from(this.targets).map((target) => {
          const rect =
            target instanceof Element
              ? target.getBoundingClientRect()
              : ({
                  x: 0,
                  y: 0,
                  width: 0,
                  height: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                } as DOMRectReadOnly);

          return {
            target,
            contentRect: rect,
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: [],
          };
        });

        if (entries.length > 0) {
          this.callback(entries, this as unknown as ResizeObserver);
        }
      };
    }

    observe(target: Element): void {
      if (!this.targets.has(target)) {
        this.targets.add(target);
        if (this.targets.size === 1) {
          globalWindow.addEventListener("resize", this.listener, { passive: true });
          // Trigger an initial measurement so ReactFlow gets the first bounds.
          this.listener();
        }
      }
    }

    unobserve(target: Element): void {
      if (this.targets.delete(target) && this.targets.size === 0) {
        globalWindow.removeEventListener("resize", this.listener);
      }
    }

    disconnect(): void {
      if (this.targets.size > 0) {
        this.targets.clear();
        globalWindow.removeEventListener("resize", this.listener);
      }
    }
  }

  // @ts-expect-error assigning polyfill to global scope
  globalWindow.ResizeObserver = ResizeObserverPolyfill;
}

createRoot(document.getElementById("root")!).render(<App />);
