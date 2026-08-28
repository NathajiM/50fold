#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CODEX = join(homedir(), '.codex');
const DRY_RUN = process.argv.includes('--dry-run');
const START = '<!-- codex-claudius:start -->';
const END = '<!-- codex-claudius:end -->';
// Derive the removal lists from this repo's own source dirs so adding a 5th agent
// or skill cannot drift out of sync with the uninstaller. Fall back to the
// `codex-` prefix scan of the installed dirs if the source is unavailable.
const HERE = dirname(fileURLToPath(import.meta.url));
const listSource = (kind, suffix) => {
  const dir = join(HERE, kind);
  if (!existsSync(dir)) return null;
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => (suffix ? e.isFile() && e.name.endsWith(suffix) : e.isDirectory()))
    .map((e) => e.name);
};
const listInstalled = (kind, suffix) => {
  const dir = join(CODEX, kind);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => (suffix ? e.isFile() && e.name.endsWith(suffix) : e.isDirectory()))
    .filter((e) => e.name.startsWith('codex-'))
    .map((e) => e.name);
};
const AGENTS = listSource('agents', '.toml') ?? listInstalled('agents', '.toml');
const SKILLS = listSource('skills', null) ?? listInstalled('skills', null);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const logAction = (verb, target) => console.log(`${DRY_RUN ? 'would ' : ''}${verb}: ${target}`);
const countBlocks = (text) => {
  const matches = text.match(new RegExp(esc(START), 'g'));
  return matches ? matches.length : 0;
};

function removeAgents() {
  const removed = [];
  for (const file of AGENTS) {
    const target = join(CODEX, 'agents', file);
    if (!existsSync(target)) continue;
    logAction('remove agent', target);
    if (!DRY_RUN) rmSync(target);
    removed.push(file);
  }
  return removed;
}

function removeSkills() {
  const removed = [];
  for (const dir of SKILLS) {
    const target = join(CODEX, 'skills', dir);
    if (!existsSync(target)) continue;
    logAction('remove skill', target);
    if (!DRY_RUN) rmSync(target, { recursive: true, force: true });
    removed.push(dir);
  }
  return removed;
}

function stripAgentsBlock() {
  const target = join(CODEX, 'AGENTS.md');
  if (!existsSync(target)) return { target, beforeCount: 0, afterCount: 0, changed: false };

  const current = readFileSync(target, 'utf8');
  const beforeCount = countBlocks(current);
  if (!current.includes(START)) return { target, beforeCount, afterCount: beforeCount, changed: false };

  const next = current
    .replace(new RegExp(`\\n*${esc(START)}[\\s\\S]*?${esc(END)}\\n*`, 'g'), '\n')
    .trimEnd() + '\n';
  const afterCount = countBlocks(next);

  logAction(`strip AGENTS.md block (${beforeCount} -> ${afterCount})`, target);
  if (!DRY_RUN) writeFileSync(target, next);
  return { target, beforeCount, afterCount, changed: true };
}

console.log(`${DRY_RUN ? 'Dry run: ' : ''}Uninstalling Codex Claudius from ${CODEX}`);
const agents = removeAgents();
const skills = removeSkills();
const agentsBlock = stripAgentsBlock();

console.log('');
console.log('removed agents:', agents.join(', ') || '(none)');
console.log('removed skills:', skills.join(', ') || '(none)');
console.log(`AGENTS block: ${agentsBlock.changed ? 'stripped' : '(not present)'} ${agentsBlock.target} (${agentsBlock.beforeCount} -> ${agentsBlock.afterCount})`);
console.log(DRY_RUN ? 'Dry run complete. No files changed.' : 'Done. Restart Codex or start a new session so removed agents and skills unload.');
