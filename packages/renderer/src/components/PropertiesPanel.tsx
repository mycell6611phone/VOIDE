import React from "react";
import { useForm } from "react-hook-form";
import { useFlowStore } from "../state/flowStore";
import { voide } from "../voide";


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
      <button
        onClick={async () => {
          const res = await voide.openFlow();
          if (res?.flow) setFlow(res.flow);
        }}
      >
        Open
      </button>
      <button
        onClick={async () => {
          await voide.saveFlow(flow);
        }}
      >
        Save
      </button>
      <button
        onClick={async () => {
          const result = await voide.validateFlow(flow);
          alert(result.ok ? "Valid" : JSON.stringify(result.errors));
        }}
      >
        Validate
      </button>
    </div>
  );
}
