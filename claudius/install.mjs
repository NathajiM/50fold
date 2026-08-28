#!/usr/bin/env node
// Claudius installer — copies agents + skills into ~/.claude and appends the
// always-on doctrine block to ~/.claude/CLAUDE.md between markers.
// Idempotent: re-running updates in place. Reverse with `node uninstall.mjs`.
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLAUDE = join(homedir(), '.claude');
const START = '<!-- claudius:start -->';
const END = '<!-- claudius:end -->';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ensureDir = (d) => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); };

function installAgents() {
  const src = join(HERE, 'agents');
  const dst = join(CLAUDE, 'agents');
  ensureDir(dst);
  const files = readdirSync(src).filter((f) => f.endsWith('.md'));
  for (const f of files) cpSync(join(src, f), join(dst, f));
  return files;
}

function installSkills() {
  const src = join(HERE, 'skills');
  const dst = join(CLAUDE, 'skills');
  ensureDir(dst);
  const dirs = readdirSync(src, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const d of dirs) cpSync(join(src, d), join(dst, d), { recursive: true });
  return dirs;
}

function installClaudeMd() {
  const block = readFileSync(join(HERE, 'assets', 'claude-md-block.md'), 'utf8').trim();
  const wrapped = `${START}\n${block}\n${END}`;
  const p = join(CLAUDE, 'CLAUDE.md');
  let cur = existsSync(p) ? readFileSync(p, 'utf8') : '';
  if (cur.includes(START) && cur.includes(END)) {
    cur = cur.replace(new RegExp(`${esc(START)}[\\s\\S]*?${esc(END)}`), wrapped);
  } else {
    cur = cur.trimEnd() + (cur.trim() ? '\n\n' : '') + wrapped + '\n';
  }
  writeFileSync(p, cur);
  return p;
}

function installConfig() {
  const dir = join(CLAUDE, 'claudius');
  ensureDir(dir);
  const dst = join(dir, 'verify-model');
  if (existsSync(dst)) return `${dst} (kept: ${readFileSync(dst, 'utf8').trim()})`;
  const def = readFileSync(join(HERE, 'config', 'verify-model.default'), 'utf8').trim() || 'opus';
  writeFileSync(dst, def + '\n');
  return `${dst} (default: ${def})`;
}

// RTK is an OPTIONAL token-saving dependency. Report its state; never install or
// reconfigure it here — `rtk init -g` rewrites the user's global settings.json,
// which is theirs to run.
function checkRtk() {
  let version;
  try {
    version = execFileSync('rtk', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'not found on PATH — Claudius works fine without it; install rtk for 30-90% smaller command output';
  }
  let hooked = false;
  try {
    const s = readFileSync(join(CLAUDE, 'settings.json'), 'utf8');
    hooked = /"command"\s*:\s*"rtk hook/.test(s);
  } catch { /* no settings.json */ }
  return `${version}${hooked ? ' (PreToolUse hook present)' : ' (no hook in settings.json — run `rtk init -g` yourself to enable auto-rewrite)'}`;
}

console.log('Installing Claudius into', CLAUDE);
const a = installAgents();
const s = installSkills();
const c = installClaudeMd();
const cfg = installConfig();
console.log('  agents :', a.join(', '));
console.log('  skills :', s.join(', '));
console.log('  doctrine block ->', c);
console.log('  verify-model  ->', cfg);
console.log('  rtk (optional)->', checkRtk());
console.log('\nDone. Restart Claude Code so the new agents + skills load.');
