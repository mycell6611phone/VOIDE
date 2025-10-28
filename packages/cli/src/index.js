import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
const args = process.argv.slice(2);
const help = `usage:
  voide validate <file.json>
  voide pack <file.json> [--out <file.flow.pb>]`;
if (args.length < 2 || ["-h", "--help"].includes(args[0])) {
    console.log(help);
    process.exit(0);
}
const cmd = args[0];
const inPath = args[1];
function readJson(p) {
    const s = fs.readFileSync(p, "utf8");
    return JSON.parse(s);
}
const FlowEnvelope = z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any())
}).passthrough();
function stable(obj) {
    if (Array.isArray(obj))
        return obj.map(stable);
    if (obj && typeof obj === "object") {
        return Object.keys(obj).sort().reduce((o, k) => { o[k] = stable(obj[k]); return o; }, {});
    }
    return obj;
}
if (cmd === "validate") {
    try {
        const json = readJson(inPath);
        const res = FlowEnvelope.safeParse(json);
        if (!res.success) {
            console.error("invalid flow");
            process.exit(1);
        }
        console.log("ok");
        process.exit(0);
    }
    catch (e) {
        console.error(String(e));
        process.exit(1);
    }
}
if (cmd === "pack") {
    const outFlag = args.indexOf("--out");
    const outPath = outFlag > -1 ? args[outFlag + 1]
        : path.join(path.dirname(inPath), path.basename(inPath, path.extname(inPath)) + ".flow.pb");
    try {
        const json = readJson(inPath);
        const bytes = Buffer.from(JSON.stringify(stable(json)));
        fs.writeFileSync(outPath, bytes);
        console.log(outPath);
        process.exit(0);
    }
    catch (e) {
        console.error(String(e));
        process.exit(1);
    }
}
console.log(help);
process.exit(1);
