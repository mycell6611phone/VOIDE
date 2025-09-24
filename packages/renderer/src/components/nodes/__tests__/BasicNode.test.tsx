import React, { type MutableRefObject } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Position, type NodeProps } from "reactflow";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import type { NodeDef } from "@voide/shared";

import BasicNode from "../BasicNode";
import { CanvasBoundaryProvider, type CanvasBoundaryContextValue } from "../../CanvasBoundaryContext";
import { useFlowStore } from "../../../state/flowStore";
import { createInitialFlow } from "../../../constants/mockLayout";

expect.extend(matchers);

const createOverlayContext = (): CanvasBoundaryContextValue => {
  const element = {
    getBoundingClientRect: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      toJSON: () => ({})
    })
  } as unknown as HTMLDivElement;

  return {
    bounds: null,
    refreshBounds: () => {},
    overlayRef: { current: element } as MutableRefObject<HTMLDivElement | null>
  };
};

const createPromptNode = (): NodeDef => ({
  id: "prompt-node",
  type: "module",
  name: "Prompt Node",
  params: { moduleKey: "prompt" },
  in: [],
  out: []
});

const renderNode = (node: NodeDef) => {
  const providerValue = createOverlayContext();

  const props = {
    id: node.id,
    data: node,
    type: node.type ?? "module",
    selected: false,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    isDraggable: true,
    isSelectable: true,
    isFocusable: true,
    xPos: 0,
    yPos: 0,
    width: 156,
    height: 82,
    targetPosition: Position.Left,
    sourcePosition: Position.Right
  } as unknown as NodeProps<NodeDef>;

  return render(
    <CanvasBoundaryProvider value={providerValue}>
      <BasicNode {...props} />
    </CanvasBoundaryProvider>
  );
};

const resetStore = () => {
  useFlowStore.setState((state) => ({
    ...state,
    flow: createInitialFlow(),
    clipboard: null
  }));
};

describe("BasicNode edit menu", () => {
  beforeEach(() => {
    resetStore();
    const node = createPromptNode();
    useFlowStore.setState((state) => ({
      ...state,
      flow: {
        id: "flow:test-basic-node",
        version: "1.0.0",
        nodes: [node],
        edges: []
      },
      clipboard: null
    }));
  });

  afterEach(() => {
    cleanup();
    resetStore();
    vi.restoreAllMocks();
  });

  it("opens the menu near the pointer and copies the node", () => {
    const node = useFlowStore.getState().flow.nodes[0];
    const copySpy = vi.spyOn(useFlowStore.getState(), "copyNode");

    renderNode(node);

    const nodeLabel = screen.getByText("Prompt Node");
    fireEvent.contextMenu(nodeLabel, { clientX: 220, clientY: 180 });

    const copyButton = screen.getByRole("button", { name: "Copy" });
    expect(copyButton).toBeInTheDocument();

    fireEvent.click(copyButton);

    expect(copySpy).toHaveBeenCalledWith(node.id);
  });

  it("disables paste when the clipboard holds an edge", () => {
    const node = useFlowStore.getState().flow.nodes[0];

    useFlowStore.setState((state) => ({
      ...state,
      clipboard: {
        kind: "edge",
        edge: {
          id: "edge:test",
          from: ["a", "out"] as [string, string],
          to: ["b", "in"] as [string, string]
        }
      }
    }));

    renderNode(node);

    fireEvent.contextMenu(screen.getByText("Prompt Node"), {
      clientX: 160,
      clientY: 140
    });

    const pasteButton = screen.getByRole("button", { name: "Paste" });
    expect(pasteButton).toBeDisabled();
  });

  it("pastes a node and repositions it near the pointer", async () => {
    const baseNode = useFlowStore.getState().flow.nodes[0];
    const clipboardNode: NodeDef = {
      id: "cached-node",
      type: "module",
      name: "Cache",
      params: { moduleKey: "cache", __position: { x: 80, y: 80 } },
      in: [],
      out: []
    };

    useFlowStore.setState((state) => ({
      ...state,
      clipboard: {
        kind: "node",
        node: clipboardNode,
        position: { x: 80, y: 80 }
      }
    }));

    renderNode(baseNode);

    const pointer = { x: 360, y: 260 };
    fireEvent.contextMenu(screen.getByText("Prompt Node"), {
      clientX: pointer.x,
      clientY: pointer.y
    });

    const pasteButton = screen.getByRole("button", { name: "Paste" });
    expect(pasteButton).toBeEnabled();

    fireEvent.click(pasteButton);

    await waitFor(() => {
      const nodes = useFlowStore.getState().flow.nodes;
      expect(nodes.length).toBe(2);
    });

    const nodes = useFlowStore.getState().flow.nodes;
    const pasted = nodes.find((node) => node.id !== baseNode.id);
    expect(pasted).toBeDefined();
    expect((pasted?.params as Record<string, any>)?.__position).toEqual({
      x: pointer.x,
      y: pointer.y
    });
  });
});

