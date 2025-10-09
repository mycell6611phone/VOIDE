import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-flow-renderer", () => {
  const useNodesState = (initialNodes: any[]) => {
    const [nodes, setNodes] = React.useState(initialNodes);
    const onNodesChange = React.useCallback(() => undefined, []);
    return [nodes, setNodes, onNodesChange];
  };

  const useEdgesState = (initialEdges: any[]) => {
    const [edges, setEdges] = React.useState(initialEdges);
    const onEdgesChange = React.useCallback(() => undefined, []);
    return [edges, setEdges, onEdgesChange];
  };

  const ReactFlow = vi.fn(
    ({ nodes, onNodeContextMenu, children }: any) => (
      <div data-testid="reactflow">
        {nodes.map((node: any) => (
          <div
            key={node.id}
            data-node-id={node.id}
            onContextMenu={(event) => onNodeContextMenu?.(event, node)}
          >
            {node.data.name}
          </div>
        ))}
        {children}
      </div>
    )
  );

  return {
    __esModule: true,
    default: ReactFlow,
    Background: ({ children }: any) => <div data-testid="reactflow-background">{children}</div>,
    Handle: ({ children }: any) => <div>{children}</div>,
    Position: { Left: "left", Right: "right" },
    addEdge: (edge: any, edges: any[]) => [...edges, edge],
    useNodesState,
    useEdgesState
  };
});

import ReactFlow from "react-flow-renderer";
import GraphCanvas from "../GraphCanvas";

describe("GraphCanvas context menu", () => {
  const ReactFlowMock = vi.mocked(ReactFlow);

  beforeEach(() => {
    ReactFlowMock.mockClear();
  });

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

  it("opens the context window at pointer coordinates without layout offsets", async () => {
    render(<GraphCanvas />);

    const container = await screen.findByTestId("graph-canvas-container");
    const overlay = screen.getByTestId("graph-canvas-overlay");

    const rect = createRect(200, 120, 1024, 768);

    Object.defineProperty(container, "getBoundingClientRect", {
      configurable: true,
      value: () => rect
    });

    Object.defineProperty(overlay, "getBoundingClientRect", {
      configurable: true,
      value: () => rect
    });

    const promptNode = await screen.findByText("Prompt");

    fireEvent.contextMenu(promptNode, { clientX: 420, clientY: 360 });

    const windowEl = await screen.findByTestId("context-window");
    expect(windowEl).toBeTruthy();
    expect(await screen.findByText("Prompt Context")).toBeTruthy();

    const left = parseFloat(windowEl.style.left);
    const top = parseFloat(windowEl.style.top);

    expect(left).toBeCloseTo(232); // clientX - overlay.left + offset
    expect(top).toBeCloseTo(252); // clientY - overlay.top + offset

    expect(left + rect.left).toBeCloseTo(432);
    expect(top + rect.top).toBeCloseTo(372);
  });

  it("enables mouse wheel zooming on the canvas", async () => {
    render(<GraphCanvas />);

    await screen.findAllByTestId("reactflow");

    expect(ReactFlowMock).toHaveBeenCalled();

    const lastCall = ReactFlowMock.mock.calls.at(-1);
    expect(lastCall).toBeTruthy();

    const props = lastCall?.[0] ?? {};
    expect(props.zoomOnScroll).toBe(true);
    expect(props.panOnScroll).toBe(false);
    expect(props.zoomOnPinch).toBe(true);
  });
});

