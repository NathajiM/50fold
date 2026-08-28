#!/usr/bin/env node
// Claudius — snapshot the precious, hand-tuned files in ~/.claude before anything
// (a third-party installer, `rtk init -g`, an npx tool) can clobber them.
// Usage: node backup-settings.mjs [--list] [--keep N]
// Backups land in ~/.claude/claudius/backups/<timestamp>/ ; the newest KEEP are kept.
import { existsSync, mkdirSync, copyFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CLAUDE = join(homedir(), '.claude');
const ROOT = join(CLAUDE, 'claudius', 'backups');
const TARGETS = ['settings.json', 'settings.local.json', 'CLAUDE.md'];
const argv = process.argv.slice(2);
const KEEP = Number(argv[argv.indexOf('--keep') + 1]) || 10;

if (argv.includes('--list')) {
  if (!existsSync(ROOT)) {
    console.log('no backups yet — run: node backup-settings.mjs');
    process.exit(0);
  }
  const snaps = readdirSync(ROOT).sort().reverse();
  console.log(`${snaps.length} backup(s) in ${ROOT}`);
  for (const s of snaps) {
    const files = readdirSync(join(ROOT, s));
    console.log(`  ${s}  [${files.join(', ')}]`);
  }
  process.exit(0);
}

// Local time, filesystem-safe, sorts lexicographically.
const d = new Date();
const p = (n, w = 2) => String(n).padStart(w, '0');
const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
const dest = join(ROOT, stamp);
mkdirSync(dest, { recursive: true });

const saved = [];
for (const f of TARGETS) {
  const src = join(CLAUDE, f);
  if (!existsSync(src)) continue;
  copyFileSync(src, join(dest, f));
  saved.push(`${f} (${statSync(src).size}B)`);
}

if (!saved.length) {
  rmSync(dest, { recursive: true, force: true });
  console.log(`nothing to back up — no target files found in ${CLAUDE}`);
  process.exit(0);
}

console.log(`backed up -> ${dest}`);
for (const s of saved) console.log(`  ${s}`);

// Prune oldest beyond KEEP.
const snaps = readdirSync(ROOT).sort();
const stale = snaps.slice(0, Math.max(0, snaps.length - KEEP));
for (const s of stale) rmSync(join(ROOT, s), { recursive: true, force: true });
if (stale.length) console.log(`pruned ${stale.length} old backup(s), keeping newest ${KEEP}`);
console.log('\nrestore: copy a file back from that folder into ~/.claude/');
