import { describe, it, expect, beforeEach } from "vitest";
import { useFlow } from "./store";

beforeEach(() => {
  useFlow.setState({
    nodes: [],
    edges: [],
    output: "",
    events: [],
    interfaceWindows: {},
    maxInterfaceZ: 1,
  });
});

describe("useFlow store", () => {
  it("adds nodes with default config", () => {
    const { addNode } = useFlow.getState();
    addNode("Input", 10, 20);
    const node = useFlow.getState().nodes[0];
    expect(node.type).toBe("Input");
    expect(node.x).toBe(10);
    expect(node.y).toBe(20);
    expect(node.status).toBe("idle");
    expect(node.config).toHaveProperty("id", "");
  });

  it("adds edges between nodes", () => {
    const { addNode, addEdge } = useFlow.getState();
    addNode("Input", 0, 0);
    addNode("Prompt", 100, 0);
    const [a, b] = useFlow.getState().nodes;
    addEdge({ node: a.id, port: "text" }, { node: b.id, port: "text" }, "UserText");
    expect(useFlow.getState().edges).toHaveLength(1);
    expect(useFlow.getState().edges[0].from.node).toBe(a.id);
    expect(useFlow.getState().edges[0].to.node).toBe(b.id);
  });

  it("opens and minimizes interface windows", () => {
    const { openInterface, minimizeInterface } = useFlow.getState();
    openInterface("node-1", { bounds: { width: 1200, height: 800 } });
    const opened = useFlow.getState().interfaceWindows["node-1"];
    expect(opened).toBeDefined();
    expect(opened?.isMinimized).toBe(false);
    minimizeInterface("node-1");
    const minimized = useFlow.getState().interfaceWindows["node-1"];
    expect(minimized?.isMinimized).toBe(true);
  });

  it("clamps geometry updates to canvas bounds", () => {
    const { openInterface, setInterfaceGeometry } = useFlow.getState();
    const bounds = { width: 600, height: 400 };
    openInterface("node-2", { bounds });
    setInterfaceGeometry(
      "node-2",
      {
        position: { x: 700, y: 500 },
        size: { width: 900, height: 700 },
      },
      bounds
    );
    const win = useFlow.getState().interfaceWindows["node-2"];
    expect(win).toBeDefined();
    expect(win!.size.width).toBeLessThanOrEqual(bounds.width);
    expect(win!.size.height).toBeLessThanOrEqual(bounds.height);
    expect(win!.position.x).toBeGreaterThanOrEqual(0);
    expect(win!.position.y).toBeGreaterThanOrEqual(0);
    expect(win!.position.x).toBeLessThanOrEqual(bounds.width - win!.size.width);
    expect(win!.position.y).toBeLessThanOrEqual(bounds.height - win!.size.height);
  });

  it("brings interface windows to front when focused", () => {
    const { openInterface, focusInterface } = useFlow.getState();
    openInterface("node-a", { bounds: { width: 800, height: 600 } });
    openInterface("node-b", { bounds: { width: 800, height: 600 } });
    const before = useFlow.getState().interfaceWindows;
    const aZ = before["node-a"].zIndex;
    const bZ = before["node-b"].zIndex;
    focusInterface("node-a");
    const after = useFlow.getState().interfaceWindows;
    expect(after["node-a"].zIndex).toBeGreaterThan(aZ);
    expect(after["node-a"].zIndex).toBeGreaterThan(after["node-b"].zIndex);
    expect(after["node-b"].zIndex).toBe(bZ);
  });
});
