import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useFlowStore } from "../state/flowStore";
import { voide } from "../voide";

type FlowFormValues = { id: string; version: string };

export default function PropertiesPanel() {
  const { flow, setFlow } = useFlowStore();
  const { register, handleSubmit, reset } = useForm<FlowFormValues>({
   defaultValues: { id: flow.id, version: flow.version }
  });

  useEffect(() => {
    reset({ id: flow.id, version: flow.version });
  }, [flow.id, flow.version, reset]);

  const onSubmit = (data: FlowFormValues) => {
    setFlow({ ...flow, id: data.id, version: data.version });
  };

  return (
    <div style={{ padding: 12, borderLeft: "1px solid #eee" }}>
      <h3>Flow</h3>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label>Id</label>
        <input {...register("id")} spellCheck />
        <label>Version</label>
        <input {...register("version")} spellCheck />
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
