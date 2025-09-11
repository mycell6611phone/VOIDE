import React from "react";
import { useForm } from "react-hook-form";
import { useFlowStore } from "../state/flowStore";
import { ipcClient } from "../lib/ipcClient";

export default function PropertiesPanel() {
  const { flow, setFlow } = useFlowStore();
  const { register, handleSubmit } = useForm({ defaultValues: { id: flow.id, version: flow.version } });

  const onSubmit = (data: any) => {
    setFlow({ ...flow, id: data.id, version: data.version });
  };

  return (
    <div style={{ padding: 12, borderLeft: "1px solid #eee" }}>
      <h3>Flow</h3>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label>Id</label><input {...register("id")} />
        <label>Version</label><input {...register("version")} />
        <button type="submit">Save</button>
      </form>
      <hr />
      <button onClick={async () => {
        const v = await ipcClient.validateFlow(flow);
        alert(v.ok ? "Valid" : JSON.stringify(v.errors));
      }}>Validate</button>
    </div>
  );
}
