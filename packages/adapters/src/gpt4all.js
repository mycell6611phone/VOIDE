export async function runGpt4All(args) {
    // @ts-ignore
    const { GPT4All } = await import("gpt4all");
    const gpt4all = new GPT4All("gpt4all", { modelPath: args.modelFile });
    await gpt4all.init();
    await gpt4all.open();
    const out = await gpt4all.prompt(args.prompt, {
        temp: args.temperature,
        nPredict: args.maxTokens
    });
    await gpt4all.close();
    return (out ?? "").toString().trim();
}
