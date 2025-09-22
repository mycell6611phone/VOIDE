import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import GraphCanvas from "../GraphCanvas";

vi.mock("reactflow", () => {
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

  const ReactFlow = ({ nodes, onNodeContextMenu, children }: any) => (
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

describe("GraphCanvas context menu", () => {
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

    const personaNode = await screen.findByText("Persona A");

    fireEvent.contextMenu(personaNode, { clientX: 420, clientY: 360 });

    const windowEl = await screen.findByTestId("context-window");

    expect(windowEl.parentElement).toBe(overlay);

    const left = parseFloat(windowEl.style.left);
    const top = parseFloat(windowEl.style.top);

    expect(left).toBeCloseTo(220); // clientX - overlay.left
    expect(top).toBeCloseTo(240); // clientY - overlay.top

    expect(left + rect.left).toBeCloseTo(420);
    expect(top + rect.top).toBeCloseTo(360);
  });
});

