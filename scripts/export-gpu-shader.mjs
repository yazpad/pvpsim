import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const source = readFileSync(new URL('../src/shaders/sim.wgsl.ts', import.meta.url), 'utf8');
const start = source.indexOf('`');
const end = source.lastIndexOf('`');
if (start < 0 || end <= start) throw Error('Cannot locate WGSL template');
let shader = source.slice(start + 1, end);
if (process.argv.includes('--parity')) {
  const diagnostic = readFileSync(new URL('../diagnostics/combat-parity.ts', import.meta.url), 'utf8');
  const extension = diagnostic.match(/export const PARITY_WGSL = [^`]*`([\s\S]*?)`;/);
  if (!extension) throw Error('Cannot locate parity WGSL extension');
  shader += extension[1];
}
if (shader.includes('${')) throw Error('Shader requires template interpolation');
const path = process.argv[2] ?? '/tmp/pvp-sim.wgsl';
writeFileSync(path, shader);
console.log(`${path}\nSHA256 ${createHash('sha256').update(shader).digest('hex')}`);
