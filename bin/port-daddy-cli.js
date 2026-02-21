#!/usr/bin/env node

// Thin shim — re-executes the TypeScript CLI via tsx.
// This file exists because package.json "bin" requires a .js entry point,
// but the real CLI is written in TypeScript (port-daddy-cli.ts).

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsxBin = join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const cliScript = join(__dirname, 'port-daddy-cli.ts');

const child = spawn(tsxBin, [cliScript, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => process.exit(code ?? 1));
