import { NodeHandler, NodeRegistry } from "../sdk/node.js";
export interface LLMProvider {
    generate(prompt: string): Promise<string>;
}
export interface Providers {
    [name: string]: LLMProvider;
}
declare const InputNode: NodeHandler<{}, {
    text: "UserText";
}, {
    id: string;
}>;
declare const PromptNode: NodeHandler<{
    text: "UserText";
}, {
    prompt: "PromptText";
}, {}>;
declare const LLMNode: NodeHandler<{
    prompt: "PromptText";
}, {
    text: "LLMText";
}, {
    model: string;
}>;
export declare class StubProvider implements LLMProvider {
    generate(prompt: string): Promise<string>;
}
declare const BranchNode: NodeHandler<{
    text: "LLMText";
}, {
    pass: "LLMText";
    fail: "LLMText";
}, {
    condition: string;
}>;
declare const RouterDividerNode: NodeHandler<{
    text: "UserText";
}, {
    valid: "LLMText";
    invalid: "LLMText";
}, {}>;
declare const BulletListNormalizerNode: NodeHandler<{
    text: "LLMText";
}, {
    text: "LLMText";
}, {}>;
declare const LogNode: NodeHandler<{
    value: "AnyBlob";
}, {
    value: "AnyBlob";
}, {
    name: string;
}>;
declare const OutputNode: NodeHandler<{
    text: "LLMText";
}, {}, {
    name: string;
}>;
export declare function registerBuiltins(registry: NodeRegistry): void;
export { InputNode, PromptNode, LLMNode, BranchNode, RouterDividerNode, BulletListNormalizerNode, LogNode, OutputNode, };
