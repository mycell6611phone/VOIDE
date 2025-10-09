import { ModulePayload } from "./runtime";
export interface DebateModuleNodeProps {
    id: string;
    config?: Uint8Array;
    onConnect?: (from: string, to: string) => void;
    onConfigure?: (cfg: Uint8Array) => void;
}
export declare function DebateModuleNode({ id, config, onConfigure }: DebateModuleNodeProps): any;
export declare function runDebateNode(input: ModulePayload, cfgBytes: Uint8Array): Promise<ModulePayload>;
//# sourceMappingURL=DebateModuleNode.d.ts.map