"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGpt4All = runGpt4All;
async function runGpt4All(args) {
    // @ts-ignore
    const { GPT4All } = await Promise.resolve().then(() => __importStar(require("gpt4all")));
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
