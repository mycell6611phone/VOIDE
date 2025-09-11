import { z } from "zod";
export const Port = z
    .object({
    port: z.string(),
    types: z.array(z.string()).default([]),
})
    .passthrough();
export const Node = z
    .object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    params: z.record(z.any()).default({}),
    in: z.array(Port).default([]),
    out: z.array(Port).default([]),
})
    .passthrough();
export const Edge = z
    .object({
    id: z.string().optional(),
    from: z.tuple([z.string(), z.string()]),
    to: z.tuple([z.string(), z.string()]),
    label: z.string().optional(),
})
    .passthrough();
export const FlowEnvelope = z
    .object({
    id: z.string(),
    version: z.string().default("1.0.0"),
    nodes: z.array(Node).default([]),
    edges: z.array(Edge).default([]),
})
    .passthrough();
export function parseFlow(text) {
    const obj = JSON.parse(text);
    return FlowEnvelope.parse(obj);
}
