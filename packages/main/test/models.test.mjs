import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { register } from "node:module";

register(new URL("./ts-esm-loader.mjs", import.meta.url).href, import.meta.url);

const { getModelRegistry, installModel } = await import(
  "../src/services/models.ts"
);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

test("registry statuses and install", async () => {
  const tmp = fs.mkdtempSync(path.join(process.cwd(), "tmp-models-"));
  process.env.HOME = tmp;
  const modelsDir = path.join(tmp, ".voide", "models");
  fs.mkdirSync(modelsDir, { recursive: true });

  const src = path.join(tmp, "foo.bin");
  fs.writeFileSync(src, "hello world");
  const hash = sha256("hello world");

  const registry = {
    models: [
      {
        id: "foo",
        name: "Foo",
        backend: "llamacpp",
        filename: "foo.bin",
        sha256: hash,
        sizeBytes: 11,
        license: "MIT",
        url: src,
      },
      {
        id: "bar",
        name: "Bar",
        backend: "llamacpp",
        filename: "bar.bin",
        sha256: hash,
        sizeBytes: 11,
        license: "Proprietary",
        url: src,
      },
      {
        id: "baz",
        name: "Baz",
        backend: "llamacpp",
        filename: "baz.bin",
        sha256: hash,
        sizeBytes: 11,
        license: "MIT",
        url: "https://example.com/baz.bin",
      },
    ],
  };
  fs.writeFileSync(path.join(modelsDir, "models.json"), JSON.stringify(registry));

  const reg1 = await getModelRegistry();
  const statuses = {};
  for (const m of reg1.models) statuses[m.id] = m.status;
  assert.equal(statuses.foo, "available-local");
  assert.equal(statuses.bar, "blocked-license");
  assert.equal(statuses.baz, "unavailable-offline");

  const events = [];
  await installModel("foo", p => events.push(p));
  const dest = path.join(modelsDir, "foo", "foo.bin");
  assert.ok(fs.existsSync(dest));
  assert.equal(fs.readFileSync(dest, "utf8"), "hello world");
  assert.ok(events.length > 0);
  assert.equal(events[events.length - 1].loaded, 11);

  const reg2 = await getModelRegistry();
  const foo = reg2.models.find(m => m.id === "foo");
  assert.equal(foo.status, "installed");

  // resume from partial
  fs.unlinkSync(dest);
  fs.writeFileSync(dest + ".partial", "hello ");
  await installModel("foo");
  assert.equal(fs.readFileSync(dest, "utf8"), "hello world");
});

