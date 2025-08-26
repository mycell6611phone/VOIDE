import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export default function Inspector({ runId }) {
    const [rows, setRows] = useState([]);
    useEffect(() => {
        if (!runId)
            return;
        const t = setInterval(async () => {
            const payloads = await window.voide.getLastRunPayloads(runId);
            setRows(payloads);
        }, 700);
        return () => clearInterval(t);
    }, [runId]);
    return (_jsx("div", { style: { overflow: "auto", borderTop: "1px solid #eee" }, children: _jsxs("table", { style: { width: "100%", fontSize: 12 }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Node" }), _jsx("th", { children: "Port" }), _jsx("th", { children: "Payload" })] }) }), _jsx("tbody", { children: rows.map((r, i) => (_jsxs("tr", { children: [_jsx("td", { children: r.nodeId }), _jsx("td", { children: r.port }), _jsx("td", { children: _jsx("pre", { style: { whiteSpace: "pre-wrap" }, children: JSON.stringify(r.payload, null, 2) }) })] }, i))) })] }) }));
}
