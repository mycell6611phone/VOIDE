import { z } from "zod";

export const PortSchema = z
  .object({
    port: z.string(),
    types: z.array(z.string()).default([]),
  })
  .passthrough();
export type Port = z.infer<typeof PortSchema>;

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
export type Node = z.infer<typeof NodeSchema>;

export const EdgeSchema = z
  .object({
    id: z.string().optional(),
    from: z.tuple([z.string(), z.string()]),
    to: z.tuple([z.string(), z.string()]),
    label: z.string().optional(),
  })
  .passthrough();
export type Edge = z.infer<typeof EdgeSchema>;

export const FlowEnvelopeSchema = z
  .object({
    id: z.string(),
    version: z.string().default("1.0.0"),
    nodes: z.array(NodeSchema).default([]),
    edges: z.array(EdgeSchema).default([]),
  })
  .passthrough();
export type FlowEnvelope = z.infer<typeof FlowEnvelopeSchema>;

export function parseFlow(text: string): FlowEnvelope {
  const obj = JSON.parse(text);
  return FlowEnvelopeSchema.parse(obj);
}

