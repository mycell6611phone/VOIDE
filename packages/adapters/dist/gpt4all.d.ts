export interface G4Args {
    modelFile: string;
    prompt: string;
    maxTokens: number;
    temperature: number;
}
export declare function runGpt4All(args: G4Args): Promise<string>;
