import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sharedRoot = resolve(scriptDir, '..');
const repoRoot = resolve(sharedRoot, '..', '..');
const protoRoot = join(repoRoot, 'proto');
const protoFile = join(protoRoot, 'flow.proto');
const outDir = join(sharedRoot, 'src', 'gen', 'flow');

mkdirSync(outDir, { recursive: true });

const args = [
  `--ts_proto_out=${outDir}`,
  '--ts_proto_opt=esModuleInterop=true,importSuffix=.js,outputServices=generic-definitions',
  `--proto_path=${protoRoot}`,
  protoFile,
];

const env = {
  ...process.env,
  PATH: [join(repoRoot, 'node_modules', '.bin'), process.env.PATH]
    .filter(Boolean)
    .join(process.platform === 'win32' ? ';' : ':'),
};

execFileSync('protoc', args, {
  stdio: 'inherit',
  env,
});
