#!/usr/bin/env node
// Claudius uninstaller — removes installed agents + skills and strips the
// doctrine block from ~/.claude/CLAUDE.md. Leaves the rest of CLAUDE.md intact.
import { existsSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CLAUDE = join(homedir(), '.claude');
const START = '<!-- claudius:start -->';
const END = '<!-- claudius:end -->';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function removeAgents() {
  const dir = join(CLAUDE, 'agents');
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.startsWith('claudius-') && f.endsWith('.md'));
  for (const f of files) rmSync(join(dir, f));
  return files;
}

function removeSkills() {
  const dir = join(CLAUDE, 'skills');
  if (!existsSync(dir)) return [];
  const dirs = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('claudius-'))
    .map((d) => d.name);
  for (const d of dirs) rmSync(join(dir, d), { recursive: true, force: true });
  return dirs;
}

function stripClaudeMd() {
  const p = join(CLAUDE, 'CLAUDE.md');
  if (!existsSync(p)) return false;
  let cur = readFileSync(p, 'utf8');
  if (!cur.includes(START)) return false;
  cur = cur.replace(new RegExp(`\\n*${esc(START)}[\\s\\S]*?${esc(END)}\\n*`), '\n').trimEnd() + '\n';
  writeFileSync(p, cur);
  return true;
}

function removeConfig() {
  const dir = join(CLAUDE, 'claudius');
  if (!existsSync(dir)) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
}

console.log('Uninstalling Claudius from', CLAUDE);
console.log('  removed agents :', removeAgents().join(', ') || '(none)');
console.log('  removed skills :', removeSkills().join(', ') || '(none)');
console.log('  CLAUDE.md block:', stripClaudeMd() ? 'stripped' : '(not present)');
console.log('  config dir     :', removeConfig() ? 'removed' : '(not present)');
console.log('\nDone. Restart Claude Code.');
