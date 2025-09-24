import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CanvasBoundaryProvider } from "../CanvasBoundaryContext";
import LLMNode from "../nodes/LLMNode";

vi.mock("reactflow", () => ({
  __esModule: true,
  Handle: ({ children }: any) => <div>{children}</div>,
  Position: { Left: "left", Right: "right" }
}));

describe("LLMNode context window", () => {
  const createRect = (left: number, top: number, width: number, height: number) => ({
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({ left, top, width, height })
  });

  it("opens the context window without throwing", async () => {
    const overlay = document.createElement("div");
    const canvasRect = createRect(200, 160, 1024, 768);

    Object.defineProperty(overlay, "getBoundingClientRect", {
      configurable: true,
      value: () => canvasRect
    });

    document.body.appendChild(overlay);

    const overlayRef = { current: overlay } as React.MutableRefObject<HTMLDivElement | null>;

    const providerValue = {
      bounds: canvasRect as unknown as DOMRectReadOnly,
      refreshBounds: vi.fn(),
      overlayRef
    };

    const nodeProps = {
      id: "llm-1",
      data: { id: "llm-1", name: "LLM Persona", in: [], out: [] }
    } as any;

    const { unmount } = render(
      <CanvasBoundaryProvider value={providerValue}>
        <div className="react-flow">
          <LLMNode {...nodeProps} />
        </div>
      </CanvasBoundaryProvider>
    );

    try {
      const reactFlow = document.querySelector(".react-flow") as HTMLDivElement;
      Object.defineProperty(reactFlow, "getBoundingClientRect", {
        configurable: true,
        value: () => canvasRect
      });

      const nodeLabel = await screen.findByText("LLM Persona");
      const nodeContainer = nodeLabel.closest("div") as HTMLDivElement;

      Object.defineProperty(nodeContainer, "getBoundingClientRect", {
        configurable: true,
        value: () => createRect(360, 240, 184, 96)
      });

      fireEvent.contextMenu(nodeContainer, { clientX: 640, clientY: 420 });

      const contextWindow = await screen.findByTestId("context-window");
      expect(contextWindow).toBeTruthy();
      expect(await screen.findByText("Quick Actions")).toBeTruthy();
      expect(parseFloat(contextWindow.style.left)).toBeGreaterThan(0);
      expect(parseFloat(contextWindow.style.top)).toBeGreaterThan(0);

      const closeButton = await screen.findByRole("button", { name: "Close" });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("context-window")).toBeNull();
      });

      const gearButton = screen.getByRole("button", { name: "Open LLM options" });
      fireEvent.click(gearButton);

      const reopenedWindow = await screen.findByTestId("context-window");
      expect(reopenedWindow).toBeTruthy();
    } finally {
      unmount();
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
    }
  });
});

