const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { getModelRegistry } = require('../dist/services/models.js');

test('loads model registry', async () => {
  const reg = await getModelRegistry();
  assert.ok(Array.isArray(reg.models));
  assert.ok(reg.models.length > 0);
});

test('returns empty list when file missing', async () => {
  const orig = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'model-test-'));
  try {
    process.chdir(tmp);
    const reg = await getModelRegistry();
    assert.deepStrictEqual(reg, { models: [] });
  } finally {
    process.chdir(orig);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('returns empty list when file invalid', async () => {
  const orig = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'model-test-invalid-'));
  const mdir = path.join(tmp, 'models');
  fs.mkdirSync(mdir);
  fs.writeFileSync(path.join(mdir, 'models.json'), 'not json');
  try {
    process.chdir(tmp);
    const reg = await getModelRegistry();
    assert.deepStrictEqual(reg, { models: [] });
  } finally {
    process.chdir(orig);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});


