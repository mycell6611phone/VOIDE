import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from "react-hook-form";
import { useFlowStore } from "../state/flowStore";
export default function PropertiesPanel() {
    const { flow, setFlow } = useFlowStore();
    const { register, handleSubmit } = useForm({ defaultValues: { id: flow.id, version: flow.version } });
    const onSubmit = (data) => {
        setFlow({ ...flow, id: data.id, version: data.version });
    };
    return (_jsxs("div", { style: { padding: 12, borderLeft: "1px solid #eee" }, children: [_jsx("h3", { children: "Flow" }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), children: [_jsx("label", { children: "Id" }), _jsx("input", { ...register("id") }), _jsx("label", { children: "Version" }), _jsx("input", { ...register("version") }), _jsx("button", { type: "submit", children: "Save" })] }), _jsx("hr", {}), _jsx("button", { onClick: async () => {
                    const res = await window.voide.openFlow();
                    if (res?.flow)
                        setFlow(res.flow);
                }, children: "Open" }), _jsx("button", { onClick: async () => { await window.voide.saveFlow(flow); }, children: "Save" }), _jsx("button", { onClick: async () => {
                    const v = await window.voide.validateFlow(flow);
                    alert(v.ok ? "Valid" : JSON.stringify(v.errors));
                }, children: "Validate" })] }));
}
