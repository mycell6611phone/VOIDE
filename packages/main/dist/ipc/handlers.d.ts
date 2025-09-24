type HandlerDeps = {
    openChatWindow: () => Promise<unknown> | unknown;
};
export declare function registerHandlers(deps: HandlerDeps): void;
export {};
