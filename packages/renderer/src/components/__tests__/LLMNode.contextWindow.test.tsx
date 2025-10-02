import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CanvasBoundaryProvider } from "../CanvasBoundaryContext";
import { EDIT_MENU_DATA_ATTRIBUTE, EDIT_MENU_WIDTH } from "../EditMenu";
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

  const mountLLMNode = async (
    canvasRect: ReturnType<typeof createRect>,
    nodeRect: ReturnType<typeof createRect>
  ) => {
    const overlay = document.createElement("div");
    Object.defineProperty(overlay, "getBoundingClientRect", {
      configurable: true,
      value: () => canvasRect
    });

    document.body.appendChild(overlay);

    const overlayRef = {
      current: overlay
    } as React.MutableRefObject<HTMLDivElement | null>;

    const providerValue = {
      bounds: canvasRect as unknown as DOMRectReadOnly,
      refreshBounds: vi.fn(),
      overlayRef
    };

    const nodeProps = {
      id: "llm-1",
      data: { id: "llm-1", name: "LLM Persona", in: [], out: [] }
    } as any;

    const renderResult = render(
      <CanvasBoundaryProvider value={providerValue}>
        <div className="react-flow">
          <LLMNode {...nodeProps} />
        </div>
      </CanvasBoundaryProvider>
    );

    const reactFlow = document.querySelector(
      ".react-flow"
    ) as HTMLDivElement;
    Object.defineProperty(reactFlow, "getBoundingClientRect", {
      configurable: true,
      value: () => canvasRect
    });

    const nodeLabel = await screen.findByText("LLM");
    const nodeContainer = nodeLabel.closest("div") as HTMLDivElement;

    Object.defineProperty(nodeContainer, "getBoundingClientRect", {
      configurable: true,
      value: () => nodeRect
    });

    return { overlay, nodeContainer, unmount: renderResult.unmount };
  };

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

      const nodeLabel = await screen.findByText("LLM");
      const nodeContainer = nodeLabel.closest("div") as HTMLDivElement;

      Object.defineProperty(nodeContainer, "getBoundingClientRect", {
        configurable: true,
        value: () => createRect(360, 240, 184, 96)
      });

      fireEvent.contextMenu(nodeContainer, { clientX: 640, clientY: 420 });

      const editMenuSelector = `[${EDIT_MENU_DATA_ATTRIBUTE}]`;

      await waitFor(() => {
        expect(document.querySelector(editMenuSelector)).not.toBeNull();
      });
      expect(screen.queryByTestId("context-window")).toBeNull();

      fireEvent.click(nodeContainer);

      const contextWindow = await screen.findByTestId("context-window");
      expect(contextWindow).toBeTruthy();
      expect(await screen.findByText("Model Selection")).toBeTruthy();
      expect(parseFloat(contextWindow.style.left)).toBeGreaterThan(0);
      expect(parseFloat(contextWindow.style.top)).toBeGreaterThan(0);
      expect(document.querySelector(editMenuSelector)).toBeNull();

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

  it("overlaps the node when lateral space is constrained", async () => {
    const canvasRect = createRect(200, 160, 640, 480);
    const nodeRect = createRect(520, 260, 184, 96);

    const { overlay, nodeContainer, unmount } = await mountLLMNode(
      canvasRect,
      nodeRect
    );

    try {
      fireEvent.click(nodeContainer);

      const contextWindow = await screen.findByTestId("context-window");
      const left = parseFloat(contextWindow.style.left || "0");
      const width = parseFloat(contextWindow.style.width || "0");

      expect(width).toBeGreaterThan(0);

      const nodeRelativeLeft = nodeRect.left - canvasRect.left;
      const nodeRelativeRight = nodeRelativeLeft + nodeRect.width;

      expect(left).toBeLessThanOrEqual(nodeRelativeLeft);
      expect(left + width).toBeGreaterThanOrEqual(nodeRelativeRight);
    } finally {
      unmount();
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
    }
  });

  it("keeps the edit menu near the node when space is limited", async () => {
    const canvasRect = createRect(200, 160, 640, 480);
    const nodeRect = createRect(520, 260, 184, 96);

    const { overlay, nodeContainer, unmount } = await mountLLMNode(
      canvasRect,
      nodeRect
    );

    try {
      fireEvent.contextMenu(nodeContainer, {
        clientX: nodeRect.left + 10,
        clientY: nodeRect.top + 10
      });

      const menu = await waitFor(() =>
        document.querySelector(`[${EDIT_MENU_DATA_ATTRIBUTE}]`)
      );

      if (!(menu instanceof HTMLDivElement)) {
        throw new Error("Expected edit menu to render");
      }

      const menuLeft = parseFloat(menu.style.left || "0");
      const menuLeftRelative = menuLeft - canvasRect.left;

      const nodeRelativeLeft = nodeRect.left - canvasRect.left;

      const gap =
        nodeRelativeLeft - (menuLeftRelative + EDIT_MENU_WIDTH);

      expect(Math.abs(gap)).toBeLessThanOrEqual(12);
    } finally {
      unmount();
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
    }
  });
});

