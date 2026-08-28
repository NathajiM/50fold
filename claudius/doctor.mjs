#!/usr/bin/env node
// Claudius doctor — reports what this setup actually depends on and whether it works.
// Reads claudius.deps.json; adding a dependency is a JSON edit, not a code change.
// Usage: node doctor.mjs [--verbose] [--updates]
//   --updates  also check upstream for addon updates and deploy drift (needs network)
// Exit 1 if any REQUIRED check fails; optional gaps never fail the run.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const VERBOSE = process.argv.includes('--verbose');
const UPDATES = process.argv.includes('--updates');
const expand = (p) => (p.startsWith('~') ? join(homedir(), p.slice(1).replace(/^[\\/]/, '')) : p);

const OK = 'OK  ';
const MISS = 'MISS';
const WARN = 'WARN';

function runCheck(c) {
  switch (c.kind) {
    case 'command': {
      try {
        const out = execFileSync(c.command, c.args ?? [], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          shell: process.platform === 'win32',
        });
        return { state: OK, value: out.trim().split('\n')[0] };
      } catch {
        return { state: MISS, value: 'not found on PATH' };
      }
    }
    case 'path': {
      const p = expand(c.path);
      return existsSync(p) ? { state: OK, value: p } : { state: MISS, value: `absent: ${p}` };
    }
    case 'read': {
      const p = expand(c.file);
      if (!existsSync(p)) return { state: MISS, value: `absent: ${p}` };
      return { state: OK, value: readFileSync(p, 'utf8').trim() || '(empty)' };
    }
    case 'contains': {
      const p = expand(c.file);
      if (!existsSync(p)) return { state: MISS, value: `absent: ${p}` };
      const hit = new RegExp(c.pattern).test(readFileSync(p, 'utf8'));
      return hit ? { state: OK, value: p } : { state: MISS, value: `pattern not found in ${p}` };
    }
    case 'nobom': {
      // A UTF-8 BOM makes strict JSON parsers choke on an otherwise valid file.
      const p = expand(c.file);
      if (!existsSync(p)) return { state: MISS, value: `absent: ${p}` };
      const head = readFileSync(p).subarray(0, 3);
      const hasBom = head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf;
      return hasBom
        ? { state: WARN, value: `UTF-8 BOM present in ${p} — strict JSON parsers will fail` }
        : { state: OK, value: `no BOM: ${p}` };
    }
    case 'glob': {
      const dir = expand(c.dir);
      if (!existsSync(dir)) return { state: MISS, value: `absent: ${dir}` };
      const re = new RegExp(c.pattern);
      const hits = readdirSync(dir).filter((f) => re.test(f));
      const need = c.expect ?? c.min ?? 1;
      if (hits.length === 0) return { state: MISS, value: `none found in ${dir}` };
      if (c.expect && hits.length !== c.expect) {
        return { state: WARN, value: `${hits.length} found, expected ${c.expect}` };
      }
      return { state: OK, value: `${hits.length}${c.expect ? `/${c.expect}` : ''} in ${dir}` };
    }
    default:
      return { state: WARN, value: `unknown check kind "${c.kind}"` };
  }
}

// ---------- update checks (--updates only; these touch the network) ----------

const git = (dir, args, timeout = 20000) =>
  execFileSync('git', ['-C', dir, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout,
  }).trim();

// Addons that Claude Code installs as real git clones can be compared to upstream.
function marketplaceUpdates() {
  const root = join(homedir(), '.claude', 'plugins', 'marketplaces');
  if (!existsSync(root)) return [];
  const rows = [];
  for (const name of readdirSync(root)) {
    const dir = join(root, name);
    if (!existsSync(join(dir, '.git'))) {
      rows.push({ name, state: '--  ', value: 'not a git clone — update via its own installer' });
      continue;
    }
    let local;
    try {
      local = git(dir, ['log', '-1', '--format=%h %cr']);
    } catch {
      rows.push({ name, state: WARN, value: 'git clone unreadable' });
      continue;
    }
    try {
      git(dir, ['fetch', '--quiet'], 45000);
    } catch {
      rows.push({ name, state: WARN, value: `${local} — fetch failed (offline?)` });
      continue;
    }
    let behind = null;
    for (const ref of ['@{u}', 'origin/HEAD', 'origin/main', 'origin/master']) {
      try {
        behind = Number(git(dir, ['rev-list', '--count', `HEAD..${ref}`]));
        break;
      } catch { /* try next ref */ }
    }
    if (behind === null) rows.push({ name, state: WARN, value: `${local} — no upstream ref to compare` });
    else if (behind === 0) rows.push({ name, state: OK, value: `up to date (${local})` });
    else rows.push({ name, state: WARN, value: `${behind} commit(s) behind (local ${local})`, fix: `claude plugin marketplace update ${name}` });
  }
  return rows;
}

// Claudius installs by copy, so the repo can drift ahead of what is actually live.
function deployDrift() {
  const CLAUDE = join(homedir(), '.claude');
  const norm = (s) => s.replace(/\r\n/g, '\n').trim();
  const pairs = [];

  const agentsDir = join(HERE, 'agents');
  if (existsSync(agentsDir)) {
    for (const f of readdirSync(agentsDir).filter((x) => x.endsWith('.md'))) {
      pairs.push([join(agentsDir, f), join(CLAUDE, 'agents', f)]);
    }
  }
  const skillsDir = join(HERE, 'skills');
  if (existsSync(skillsDir)) {
    for (const d of readdirSync(skillsDir)) {
      const src = join(skillsDir, d);
      if (!statSync(src).isDirectory()) continue;
      for (const f of readdirSync(src)) pairs.push([join(src, f), join(CLAUDE, 'skills', d, f)]);
    }
  }

  const drifted = [];
  for (const [src, dst] of pairs) {
    if (!existsSync(dst)) { drifted.push(`${relative(HERE, src)} (not installed)`); continue; }
    if (norm(readFileSync(src, 'utf8')) !== norm(readFileSync(dst, 'utf8'))) {
      drifted.push(relative(HERE, src));
    }
  }

  // The always-on doctrine block lives inside the user's CLAUDE.md between markers.
  const assetPath = join(HERE, 'assets', 'claude-md-block.md');
  const mdPath = join(CLAUDE, 'CLAUDE.md');
  if (existsSync(assetPath) && existsSync(mdPath)) {
    const m = readFileSync(mdPath, 'utf8').match(/<!-- claudius:start -->([\s\S]*?)<!-- claudius:end -->/);
    if (!m) drifted.push('assets/claude-md-block.md (block missing from CLAUDE.md)');
    else if (norm(m[1]) !== norm(readFileSync(assetPath, 'utf8'))) drifted.push('assets/claude-md-block.md');
  }

  return { count: pairs.length, drifted };
}

const manifest = JSON.parse(readFileSync(join(HERE, 'claudius.deps.json'), 'utf8'));
const results = manifest.checks.map((c) => ({ c, r: runCheck(c) }));

console.log('\nClaudius doctor');
console.log('='.repeat(60));

for (const group of manifest.groups) {
  const rows = results.filter(({ c }) => c.group === group);
  if (!rows.length) continue;
  console.log(`\n[${group}]`);
  for (const { c, r } of rows) {
    // An optional thing that is simply absent is a gap, not a failure.
    const state = r.state === MISS && !c.required ? '--  ' : r.state;
    console.log(`  ${state}  ${c.label.padEnd(26)} ${r.value}`);
    if (r.state !== OK && c.fix) console.log(`        fix: ${c.fix}`);
    if (c.note && (r.state === OK || VERBOSE)) console.log(`        note: ${c.note}`);
    if (VERBOSE && c.why) console.log(`        why: ${c.why}`);
  }
}

let stale = [];
let drift = null;
if (UPDATES) {
  console.log('\n[updates]  (fetching upstream…)');
  const rows = marketplaceUpdates();
  for (const row of rows) {
    console.log(`  ${row.state}  ${row.name.padEnd(26)} ${row.value}`);
    if (row.fix) console.log(`        fix: ${row.fix}`);
  }
  stale = rows.filter((r) => r.fix);

  drift = deployDrift();
  const label = 'claudius deploy';
  if (!drift.drifted.length) {
    console.log(`  ${OK}  ${label.padEnd(26)} installed copy matches repo (${drift.count} files)`);
  } else {
    console.log(`  ${WARN}  ${label.padEnd(26)} ${drift.drifted.length}/${drift.count} file(s) drifted from repo`);
    for (const d of drift.drifted) console.log(`          - ${d}`);
    console.log('        fix: node install.mjs');
  }
}

const failed = results.filter(({ c, r }) => c.required && r.state !== OK);
const gaps = results.filter(({ c, r }) => !c.required && r.state !== OK);

console.log('\n' + '='.repeat(60));
if (failed.length) {
  console.log(`FAIL — ${failed.length} required check(s) failing: ${failed.map(({ c }) => c.id).join(', ')}`);
} else {
  console.log('PASS — all required checks OK.');
}
if (gaps.length) console.log(`${gaps.length} optional gap(s): ${gaps.map(({ c }) => c.id).join(', ')}`);
if (UPDATES) {
  if (stale.length) console.log(`${stale.length} addon(s) behind upstream: ${stale.map((s) => s.name).join(', ')}`);
  if (drift?.drifted.length) console.log('claudius repo is ahead of the installed copy — run: node install.mjs');
  if (!stale.length && !drift?.drifted.length) console.log('addons up to date, install matches repo.');
} else {
  console.log('run with --updates to check upstream for addon updates and deploy drift.');
}
if (!VERBOSE) console.log('run with --verbose for rationale on each dependency.');

process.exit(failed.length ? 1 : 0);
