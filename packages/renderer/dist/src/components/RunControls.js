import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function RunControls({ onRun, onStop }) {
    return (_jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", padding: 8, borderBottom: "1px solid #eee" }, children: [_jsx("button", { onClick: onRun, children: "Run" }), _jsx("button", { onClick: onStop, children: "Stop" })] }));
}
