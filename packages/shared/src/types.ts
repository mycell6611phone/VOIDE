export type Role = 'system' | 'user' | 'assistant';

export type PayloadT =
  | { kind: 'text'; text: string }
  | { kind: 'json'; value: unknown }
  | { kind: 'messages'; messages: { role: Role; content: string }[] }
  | { kind: 'vector'; values: number[] }
  | { kind: 'file'; path: string; mime: string }
  | { kind: 'code'; language: string; text: string }
  | { kind: 'metrics'; data: Record<string, number> };

export interface PortDef { port: string; types: string[] }

export type NodeKind =
  | 'UI'
  | 'LLM'
  | 'Prompt'
  | 'Memory'
  | 'ToolCall'
  | 'Log'
  | 'Cache'
  | 'Router'
  | 'Validator';

export interface LLMConfig {
  backend: string;
  model: string;
  params: Record<string, unknown>;
  strictSchema: 'hard' | 'soft' | 'off';
  tokenLimits: { input: number; output: number };
}

export interface MemoryConfig {
  store: 'sqlite' | 'faiss' | 'chroma';
  k: number;
  modes: ('save' | 'recall')[];
}

export interface NodeDef {
  id: string;
  kind: NodeKind;
  type: string;
  name: string;
  params: Record<string, unknown>;
  in: PortDef[];
  out: PortDef[];
  llm?: LLMConfig;
  memory?: MemoryConfig;
}

export type EdgeType = 'data' | 'sensor' | 'telemetry';

export interface EdgeDef {
  id: string;
  from: [string, string];
  to: [string, string];
  label?: string;
  direction?: string;
  edgeType: EdgeType;
}

export interface GraphMeta {
  name?: string;
  description?: string;
  [key: string]: unknown;
}

export interface RunSettings {
  concurrency?: number;
  [key: string]: unknown;
}

export interface FlowDef {
  id: string;
  version: string;
  engine?: string;
  meta?: GraphMeta;
  run?: RunSettings;
  nodes: NodeDef[];
  edges: EdgeDef[];
  prompts?: unknown;
  models?: unknown;
  profiles?: unknown;
}

export type RuntimeProfile = 'CPU' | 'CUDA';

export interface RunLog {
  runId: string;
  nodeId: string;
  tokens: number;
  latencyMs: number;
  status: 'ok' | 'error';
  error?: string;
}

export interface LLMParams {
  adapter: 'llama.cpp' | 'gpt4all' | 'mock';
  modelId: string;
  temperature: number;
  maxTokens: number;
  runtime: RuntimeProfile;
}

export interface LoopParams {
  maxIters: number;
  stopOn?: string;
}
