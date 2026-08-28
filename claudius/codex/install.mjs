#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CODEX = join(homedir(), '.codex');
const DRY_RUN = process.argv.includes('--dry-run');
const START = '<!-- codex-claudius:start -->';
const END = '<!-- codex-claudius:end -->';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const logAction = (verb, target) => console.log(`${DRY_RUN ? 'would ' : ''}${verb}: ${target}`);
const ensureDir = (dir) => {
  if (DRY_RUN) {
    logAction('ensure dir', dir);
    return;
  }
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

function countBlocks(text) {
  const matches = text.match(new RegExp(esc(START), 'g'));
  return matches ? matches.length : 0;
}

function installAgents() {
  const src = join(HERE, 'agents');
  const dst = join(CODEX, 'agents');
  ensureDir(dst);
  const files = readdirSync(src).filter((file) => file.endsWith('.toml'));
  for (const file of files) {
    const target = join(dst, file);
    logAction('copy agent', target);
    if (!DRY_RUN) cpSync(join(src, file), target);
  }
  return files;
}

function installSkills() {
  const src = join(HERE, 'skills');
  const dst = join(CODEX, 'skills');
  ensureDir(dst);
  const dirs = readdirSync(src, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  for (const dir of dirs) {
    const target = join(dst, dir);
    logAction('copy skill', target);
    if (!DRY_RUN) cpSync(join(src, dir), target, { recursive: true });
  }
  return dirs;
}

function installAgentsBlock() {
  // Own the markers here rather than trusting the asset to carry them: if a marker
  // were ever edited out of the asset, every install would append an un-strippable
  // duplicate. Strip any markers the asset does carry, then wrap exactly once.
  const raw = readFileSync(join(HERE, 'assets', 'codex-agents-block.md'), 'utf8');
  const body = raw
    .replace(new RegExp(esc(START), 'g'), '')
    .replace(new RegExp(esc(END), 'g'), '')
    .trim();
  const block = `${START}\n${body}\n${END}`;
  const target = join(CODEX, 'AGENTS.md');
  const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
  const beforeCount = countBlocks(current);
  let next;

  if (current.includes(START) && current.includes(END)) {
    const withoutManagedBlocks = current
      .replace(new RegExp(`\\n*${esc(START)}[\\s\\S]*?${esc(END)}\\n*`, 'g'), '\n')
      .trimEnd();
    next = `${withoutManagedBlocks}${withoutManagedBlocks.trim() ? '\n\n' : ''}${block}\n`;
  } else {
    next = `${current.trimEnd()}${current.trim() ? '\n\n' : ''}${block}\n`;
  }

  const afterCount = countBlocks(next);
  logAction(`update AGENTS.md block (${beforeCount} -> ${afterCount})`, target);
  if (!DRY_RUN) writeFileSync(target, next);
  return { target, beforeCount, afterCount };
}

console.log(`${DRY_RUN ? 'Dry run: ' : ''}Installing Codex Claudius into ${CODEX}`);
const agents = installAgents();
const skills = installSkills();
const agentsBlock = installAgentsBlock();

console.log('');
console.log('agents:', agents.join(', ') || '(none)');
console.log('skills:', skills.join(', ') || '(none)');
console.log(`AGENTS block: ${agentsBlock.target} (${agentsBlock.beforeCount} -> ${agentsBlock.afterCount})`);
console.log('hooks: not installed by default; opt-in source is codex/hooks/hooks.json');
console.log(DRY_RUN ? 'Dry run complete. No files changed.' : 'Done. Restart Codex or start a new session so agents and skills load.');
