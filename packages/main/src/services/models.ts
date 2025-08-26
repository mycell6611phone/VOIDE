import fs from "fs";
import path from "path";

export async function getModelRegistry(): Promise<any> {
  const p = path.resolve(process.cwd(), "models/models.json");
  const json = JSON.parse(fs.readFileSync(p, "utf-8"));
  return json;
}
