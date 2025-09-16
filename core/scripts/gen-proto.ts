import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const protoDir = join(root, 'protos');
const repoRoot = resolve(root, '..');
const sharedProtoDir = join(repoRoot, 'proto');
const outDir = join(root, 'src', 'proto');
const pyOutDir = join(sharedProtoDir, 'python');

const protoFiles = [
  join(protoDir, 'voide', 'v1', 'flow.proto'),
  join(sharedProtoDir, 'voide', 'modules', 'llm.proto'),
];

const includePaths = [protoDir, sharedProtoDir];

mkdirSync(outDir, { recursive: true });
mkdirSync(pyOutDir, { recursive: true });

const includeArgs = includePaths.map((dir) => `--proto_path=${dir}`);

execFileSync(
  'protoc',
  [
    `--ts_proto_out=${outDir}`,
    '--ts_proto_opt=esModuleInterop=true,importSuffix=.js',
    ...includeArgs,
    ...protoFiles,
  ],
  { stdio: 'inherit' }
);

execFileSync(
  'protoc',
  [
    `--python_out=${pyOutDir}`,
    ...includeArgs,
    ...protoFiles,
  ],
  { stdio: 'inherit' }
);

