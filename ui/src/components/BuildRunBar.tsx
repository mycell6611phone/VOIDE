import { useFlow, NODE_SPECS } from "../store";

export default function BuildRunBar() {
  const {
    nodes,
    edges,
    flowBin,
    setFlowBin,
    setStatus,
    setOutput,
    resetStatuses,
  } = useFlow();

  function handleBuild() {
    const canvas = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: `${n.type}Node`,
        in: NODE_SPECS[n.type].in,
        out: NODE_SPECS[n.type].out,
      })),
      edges: edges.map((e) => ({
        from: [e.from.node, e.from.port] as [string, string],
        to: [e.to.node, e.to.port] as [string, string],
      })),
    };
    const worker = new Worker(
      new URL("../workers/compileWorker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (e) => {
      const d = e.data;
      if (d.type === "success") {
        setFlowBin(new Uint8Array(d.bin));
      } else {
        alert(d.message);
      }
      worker.terminate();
    };
    worker.postMessage(canvas);
  }

  function handleRun() {
    if (!flowBin) return;
    resetStatuses();
    setOutput("");
    const worker = new Worker(
      new URL("../workers/runWorker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (e) => {
      const d = e.data;
      switch (d.type) {
        case "NODE_START":
          setStatus(d.nodeId, "running");
          break;
        case "NODE_END":
          setStatus(d.nodeId, "success");
          break;
        case "NODE_ERROR":
          setStatus(d.nodeId, "error");
          break;
        case "done":
          setOutput(Object.values(d.result.outputs)[0] as string);
          worker.terminate();
          break;
      }
    };
    worker.postMessage({ flowBin });
  }

  return (
    <div className="flex gap-2 p-2 border-b">
      <button
        className="px-3 py-1 bg-blue-500 text-white rounded"
        onClick={handleBuild}
      >
        Build
      </button>
      <button
      className="px-3 py-1 bg-green-600 text-white rounded"
      onClick={handleRun}
      >
        Run
      </button>
    </div>
  );
}

