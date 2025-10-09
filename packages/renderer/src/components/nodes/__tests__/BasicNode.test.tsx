import React, { type MutableRefObject } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Position, ReactFlowProvider, type NodeProps } from "react-flow-renderer";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import type { NodeDef } from "@voide/shared";

import BasicNode from "../BasicNode";
import { CanvasBoundaryProvider, type CanvasBoundaryContextValue } from "../../CanvasBoundaryContext";
import { useFlowStore } from "../../../state/flowStore";
import { createInitialFlow } from "../../../constants/mockLayout";
import {
  PORT_ACTIVITY_RESET_DELAY_MS,
  recordInputPortActivity,
  recordOutputPortActivity,
  resetPortActivityStore
} from "../../../state/portActivityStore";

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

const createSwitchableNode = (): NodeDef => ({
  id: "switchable-node",
  type: "module",
  name: "Switchable Module",
  params: { moduleKey: "prompt" },
  in: [{ port: "input" }],
  out: [{ port: "output" }]
});

const TestNode = ({ nodeId }: { nodeId: string }) => {
  const node = useFlowStore((state) =>
    state.flow.nodes.find((entry) => entry.id === nodeId)
  );

  if (!node) {
    throw new Error(`Node ${nodeId} not found in store`);
  }

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

  return <BasicNode {...props} />;
};

const renderNode = (node: NodeDef) => {
  const providerValue = createOverlayContext();

  return render(
    <CanvasBoundaryProvider value={providerValue}>
      <ReactFlowProvider>
        <TestNode nodeId={node.id} />
      </ReactFlowProvider>
    </CanvasBoundaryProvider>
  );
};

const resetStore = () => {
  useFlowStore.setState((state) => ({
    ...state,
    flow: createInitialFlow(),
    clipboard: null
  }));
  resetPortActivityStore();
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

  it("keeps the prompt textarea focused while typing", async () => {
    const node = useFlowStore.getState().flow.nodes[0];

    useFlowStore.setState((state) => ({
      ...state,
      flow: {
        ...state.flow,
        nodes: state.flow.nodes.map((entry) =>
          entry.id === node.id
            ? {
                ...entry,
                params: {
                  ...(entry.params ?? {}),
                  moduleKey: "prompt",
                  text: "",
                  preset: "custom",
                },
              }
            : entry
        ),
      },
    }));

    renderNode(node);

    const nodeLabel = screen.getByText("Prompt Node");
    fireEvent.click(nodeLabel, { button: 0 });

    const textarea = await screen.findByPlaceholderText(
      "Custom prompt here.."
    );

    textarea.focus();
    fireEvent.change(textarea, { target: { value: "Hello" } });

    await waitFor(() => {
      expect(document.activeElement).toBe(textarea);
    });

    fireEvent.change(textarea, { target: { value: "Hello world" } });

    await waitFor(() => {
      expect(document.activeElement).toBe(textarea);
    });
  });

  it("surfaces exactly two inline prompt examples and applies the selection", async () => {
    const node = useFlowStore.getState().flow.nodes[0];

    useFlowStore.setState((state) => ({
      ...state,
      flow: {
        ...state.flow,
        nodes: state.flow.nodes.map((entry) =>
          entry.id === node.id
            ? {
                ...entry,
                params: {
                  ...(entry.params ?? {}),
                  moduleKey: "prompt",
                  text: "",
                  preset: "custom",
                },
              }
            : entry
        ),
      },
    }));

    renderNode(node);

    fireEvent.click(screen.getByText("Prompt Node"), { button: 0 });

    const textarea = await screen.findByPlaceholderText("Custom prompt here..");
    const inlineExamples = await screen.findAllByTestId("prompt-inline-example");
    expect(inlineExamples).toHaveLength(2);

    fireEvent.click(
      screen.getByRole("button", {
        name: "You are a helpful AI assistant.",
      })
    );

    await waitFor(() => {
      expect(textarea.value).toBe("You are a helpful AI assistant.");
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(textarea);
    });
  });

  it("opens the prompt help modal and copies an example", async () => {
    const node = useFlowStore.getState().flow.nodes[0];

    useFlowStore.setState((state) => ({
      ...state,
      flow: {
        ...state.flow,
        nodes: state.flow.nodes.map((entry) =>
          entry.id === node.id
            ? {
                ...entry,
                params: {
                  ...(entry.params ?? {}),
                  moduleKey: "prompt",
                  text: "",
                  preset: "custom",
                },
              }
            : entry
        ),
      },
    }));

    renderNode(node);

    fireEvent.click(screen.getByText("Prompt Node"), { button: 0 });

    await screen.findByPlaceholderText("Custom prompt here..");

    const helpButton = screen.getByRole("button", { name: "Open prompt help" });

    const originalClipboard = (navigator as any).clipboard;
    const writeText = vi.fn().mockResolvedValue(undefined);
    (navigator as any).clipboard = { writeText };

    try {
      fireEvent.click(helpButton);

      const modal = await screen.findByTestId("prompt-help-modal");
      expect(modal).toBeInTheDocument();

      const copyButton = within(modal).getByRole("button", {
        name: "Copy prompt from Nielsen Norman Group",
      });

      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(
          "Outline three usability heuristics from Nielsen Norman Group that this flow should reinforce, then recommend one action item."
        );
      });

      await waitFor(() => {
        expect(within(modal).getByText("Copied!")).toBeInTheDocument();
      });

      fireEvent.click(
        within(modal).getByRole("button", { name: "Close prompt examples" })
      );

      await waitFor(() => {
        expect(screen.queryByTestId("prompt-help-modal")).not.toBeInTheDocument();
      });
    } finally {
      if (originalClipboard === undefined) {
        delete (navigator as any).clipboard;
      } else {
        (navigator as any).clipboard = originalClipboard;
      }
    }
  });

  it("toggles input orientation through the edit menu", async () => {
    const node = createSwitchableNode();

    useFlowStore.setState((state) => ({
      ...state,
      flow: {
        id: "flow:test-orientation",
        version: "1.0.0",
        nodes: [node],
        edges: []
      }
    }));

    renderNode(node);

    const getNodeContainer = () =>
      screen
        .getByText("Switchable Module")
        .closest("[data-voide-io-orientation]") as HTMLElement;

    expect(getNodeContainer().dataset.voideIoOrientation).toBe("default");

    fireEvent.contextMenu(screen.getByText("Switchable Module"), {
      clientX: 240,
      clientY: 200
    });

    const reverseButton = screen.getByRole("button", { name: "Reverse Inputs" });
    expect(reverseButton).toBeEnabled();

    fireEvent.click(reverseButton);

    await waitFor(() => {
      expect(getNodeContainer().dataset.voideIoOrientation).toBe("reversed");
    });

    let storedNode = useFlowStore.getState().flow.nodes[0];
    expect(
      (storedNode.params as Record<string, unknown>)?.__ioOrientation
    ).toBe("reversed");

    fireEvent.contextMenu(screen.getByText("Switchable Module"), {
      clientX: 240,
      clientY: 200
    });

    const reverseAgain = screen.getByRole("button", { name: "Reverse Inputs" });
    fireEvent.click(reverseAgain);

    await waitFor(() => {
      expect(getNodeContainer().dataset.voideIoOrientation).toBe("default");
    });

    storedNode = useFlowStore.getState().flow.nodes[0];
    expect(
      (storedNode.params as Record<string, unknown>)?.__ioOrientation
    ).toBeUndefined();
  });
});

describe("BasicNode port telemetry", () => {
  it("lights input and output handles when activity is recorded", async () => {
    vi.useFakeTimers();
    try {
      const node = createSwitchableNode();
      useFlowStore.setState((state) => ({
        ...state,
        flow: {
          id: "flow:test-port-activity",
          version: "1.0.0",
          nodes: [node],
          edges: []
        },
        clipboard: null
      }));

      const { container } = renderNode(node);

      const inputHandle = container.querySelector(
        `[data-voide-port-id="${node.id}:input"][data-voide-port-role="input"]`
      ) as HTMLElement | null;
      const outputHandle = container.querySelector(
        `[data-voide-port-id="${node.id}:output"][data-voide-port-role="output"]`
      ) as HTMLElement | null;
      const inputLabel = container.querySelector(
        '[data-voide-port-label][data-voide-port-role="input"]'
      ) as HTMLElement | null;
      const outputLabel = container.querySelector(
        '[data-voide-port-label][data-voide-port-role="output"]'
      ) as HTMLElement | null;

      expect(inputHandle).not.toBeNull();
      expect(outputHandle).not.toBeNull();
      expect(inputLabel).not.toBeNull();
      expect(outputLabel).not.toBeNull();

      act(() => {
        recordInputPortActivity(node.id, "input");
      });
      expect(inputHandle?.dataset.voidePortState).toBe("input-active");
      expect(inputHandle?.style.background).toBe("rgb(56, 189, 248)");
      expect(inputLabel?.style.color).toBe("rgb(2, 132, 199)");

      act(() => {
        recordOutputPortActivity(node.id, "output");
      });
      expect(outputHandle?.dataset.voidePortState).toBe("output-active");
      expect(outputHandle?.style.background).toBe("rgb(249, 115, 22)");
      expect(outputLabel?.style.color).toBe("rgb(194, 65, 12)");

      await act(async () => {
        vi.advanceTimersByTime(PORT_ACTIVITY_RESET_DELAY_MS + 10);
      });

      expect(inputHandle?.dataset.voidePortState).toBe("idle");
      expect(outputHandle?.dataset.voidePortState).toBe("idle");
      expect(inputHandle?.style.background).toBe("rgb(31, 41, 55)");
      expect(outputHandle?.style.background).toBe("rgb(31, 41, 55)");
    } finally {
      vi.useRealTimers();
    }
  });
});

