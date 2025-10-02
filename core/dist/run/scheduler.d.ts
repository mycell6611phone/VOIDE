export declare class Scheduler {
    private steps;
    private cancelled;
    private waiters;
    private notify;
    pause(): void;
    resume(): void;
    cancel(): void;
    step(): void;
    next(): Promise<void>;
}
