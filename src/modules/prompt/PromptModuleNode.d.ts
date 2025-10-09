export interface PromptModuleNodeProps {
    id: string;
    config?: Uint8Array | null;
    selected?: boolean;
    onConfigure?: (cfg: Uint8Array) => void;
    onMenuOpen?: (id: string) => void;
    onMenuClose?: (id: string) => void;
}
export declare function PromptModuleNode({ id, config, selected, onConfigure, onMenuOpen, onMenuClose, }: PromptModuleNodeProps): any;
export default PromptModuleNode;
//# sourceMappingURL=PromptModuleNode.d.ts.map