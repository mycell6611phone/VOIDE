import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const protoDir = join(root, 'protos');
const outDir = join(root, 'src', 'proto');

const protoFile = join(protoDir, 'voide', 'v1', 'flow.proto');

execSync(
  `protoc --ts_proto_out=${outDir} --ts_proto_opt=esModuleInterop=true --proto_path=${protoDir} ${protoFile}`,
  { stdio: 'inherit' }
);

