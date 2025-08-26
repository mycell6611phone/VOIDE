import React from "react";
import { useForm } from "react-hook-form";
import { useFlowStore } from "../state/flowStore";

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
        const res = await window.voide.openFlow();
        if (res?.flow) setFlow(res.flow);
      }}>Open</button>
      <button onClick={async () => { await window.voide.saveFlow(flow); }}>Save</button>
      <button onClick={async () => {
        const v = await window.voide.validateFlow(flow);
        alert(v.ok ? "Valid" : JSON.stringify(v.errors));
      }}>Validate</button>
    </div>
  );
}
