import { z } from "zod";
export const PortSchema = z
    .object({
    port: z.string(),
    types: z.array(z.string()).default([]),
})
    .passthrough();
export const NodeSchema = z
    .object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    params: z.record(z.any()).default({}),
    in: z.array(PortSchema).default([]),
    out: z.array(PortSchema).default([]),
})
    .passthrough();
export const EdgeSchema = z
    .object({
    id: z.string().optional(),
    from: z.tuple([z.string(), z.string()]),
    to: z.tuple([z.string(), z.string()]),
    label: z.string().optional(),
})
    .passthrough();
export const FlowEnvelopeSchema = z
    .object({
    id: z.string(),
    version: z.string().default("1.0.0"),
    nodes: z.array(NodeSchema).default([]),
    edges: z.array(EdgeSchema).default([]),
})
    .passthrough();
export function parseFlow(text) {
    const obj = JSON.parse(text);
    return FlowEnvelopeSchema.parse(obj);
}
