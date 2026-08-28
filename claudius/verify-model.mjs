#!/usr/bin/env node
// Claudius verify-model switch — sets the STANDING model for the verification (advisor) gate.
// Usage: node verify-model.mjs [status|opus|fable]
//   status         show the current setting
//   opus           use claudius-advisor-opus   (Opus 5)  <- default
//   fable          use claudius-advisor-fable  (Fable)
// The setting lives at ~/.claude/claudius/verify-model and is read by the
// dispatch / worktree-task doctrine when it runs the verify gate.
// This is a FLOOR, not a ceiling: the doctrine still escalates an individual
// high-stakes task to Fable even when the standing setting is opus.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = join(homedir(), '.claude', 'claudius');
const FILE = join(DIR, 'verify-model');
const AGENT = { fable: 'claudius-advisor-fable', opus: 'claudius-advisor-opus' };

function read() {
  if (!existsSync(FILE)) return 'opus';
  const v = readFileSync(FILE, 'utf8').trim().toLowerCase();
  return AGENT[v] ? v : 'opus';
}

function write(v) {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, v + '\n');
}

const arg = (process.argv[2] || 'status').toLowerCase();
if (arg === 'status') {
  const v = read();
  console.log(`verify-model: ${v}  ->  ${AGENT[v]}`);
} else if (AGENT[arg]) {
  write(arg);
  console.log(`verify-model set to: ${arg}  ->  ${AGENT[arg]}`);
} else {
  console.error(`unknown option "${arg}". use: status | opus | fable`);
  process.exit(1);
}
