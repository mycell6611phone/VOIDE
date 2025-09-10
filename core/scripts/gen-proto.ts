import { execSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const protoDir = path.join(root, 'protos');
const outDir = path.join(root, 'src', 'proto');

const protoFile = path.join(protoDir, 'voide', 'v1', 'flow.proto');

execSync(
  `protoc --ts_proto_out=${outDir} --ts_proto_opt=esModuleInterop=true --proto_path=${protoDir} ${protoFile}`,
  { stdio: 'inherit' }
);

