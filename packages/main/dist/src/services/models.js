"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModelRegistry = getModelRegistry;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function getModelRegistry() {
    const p = path_1.default.resolve(process.cwd(), "models/models.json");
    const json = JSON.parse(fs_1.default.readFileSync(p, "utf-8"));
    return json;
}
