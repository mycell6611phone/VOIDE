import { describe, it, expect, beforeEach } from "vitest";
import { useFlow } from "./store";

beforeEach(() => {
  useFlow.setState({ nodes: [], edges: [], output: "" });
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
});
