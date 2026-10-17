#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const SOURCE = path.resolve(__dirname, '..');
const MARKER = '.agent-team.json';
const OWNER = 'bwdurst/agent-team';

async function stat(file) {
  try { return await fs.lstat(file); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

async function hashes(directory) {
  const result = {};
  async function walk(current, relative = '') {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!relative && entry.name === MARKER) continue;
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Refusing linked skill content: ${full}`);
      if (entry.isDirectory()) await walk(full, rel);
      else if (entry.isFile()) result[rel] = crypto.createHash('sha256').update(await fs.readFile(full)).digest('hex');
      else throw new Error(`Unsupported file type: ${full}`);
    }
  }
  await walk(directory);
  return result;
}

function equal(a, b) {
  return a && b && JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
}

// Never traverse links in managed installation directories. Claude's final skill
// entries are intentionally links, but their parents must be ordinary folders.
async function plainParents(root, relative) {
  let current = root;
  for (const part of ['', ...relative.split('/').filter(Boolean)]) {
    if (part) current = path.join(current, part);
    const item = await stat(current);
    if (item && (!item.isDirectory() || item.isSymbolicLink())) {
      throw new Error(`Expected an ordinary directory, preserving: ${current}`);
    }
  }
}

async function plan(root, update) {
  const manifest = JSON.parse(await fs.readFile(path.join(SOURCE, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || !/^\d+\.\d+\.\d+$/.test(manifest.version) ||
      !Array.isArray(manifest.skills) || !manifest.skills.length || new Set(manifest.skills).size !== manifest.skills.length ||
      manifest.skills.some(name => !/^[a-z][a-z0-9-]*$/.test(name))) throw new Error('Invalid package manifest');
  await plainParents(root, '.agents/skills');
  await plainParents(root, '.claude/skills');
  await plainParents(root, '.agent-team-backups');
  const actions = [];
  for (const name of manifest.skills) {
    const source = path.join(SOURCE, 'skills', name);
    await plainParents(SOURCE, `skills/${name}`);
    const incoming = await hashes(source);
    if (!incoming['SKILL.md']) throw new Error(`Missing SKILL.md: ${name}`);
    const target = path.join(root, '.agents', 'skills', name);
    const link = path.join(root, '.claude', 'skills', name);
    const existing = await stat(target);
    let action = 'install';
    if (existing) {
      if (!existing.isDirectory() || existing.isSymbolicLink()) throw new Error(`Existing profile is not managed: ${target}`);
      let marker;
      try {
        const markerStat = await stat(path.join(target, MARKER));
        if (!markerStat?.isFile() || markerStat.isSymbolicLink()) throw new Error('No marker');
        marker = JSON.parse(await fs.readFile(path.join(target, MARKER), 'utf8'));
      } catch { throw new Error(`Existing profile is not managed; preserving: ${target}`); }
      if (marker.owner !== OWNER || marker.name !== name || !equal(marker.hashes, await hashes(target))) {
        throw new Error(`Existing profile is unmanaged or locally modified; preserving: ${target}`);
      }
      if (equal(incoming, marker.hashes) && marker.version === manifest.version) action = 'unchanged';
      else if (update) action = 'update';
      else throw new Error(`Update available for ${name} (${marker.version} -> ${manifest.version}); rerun with --update to back up and replace the unmodified managed copy.`);
    }
    const linkStat = await stat(link);
    let createLink = !linkStat;
    if (linkStat) {
      if (!linkStat.isSymbolicLink()) throw new Error(`Existing Claude profile is not a link; preserving: ${link}`);
      const destination = path.resolve(path.dirname(link), await fs.readlink(link));
      if (destination.toLowerCase() !== target.toLowerCase() && process.platform === 'win32' ||
          destination !== target && process.platform !== 'win32') throw new Error(`Claude link points elsewhere; preserving: ${link}`);
      createLink = false;
    }
    actions.push({ name, source, target, link, incoming, action, createLink });
  }
  return { version: manifest.version, actions };
}

async function install({ root = os.homedir(), update = false, dryRun = false } = {}) {
  root = path.resolve(root);
  // Preflight every skill before writing anything, including the lock.
  let proposal = await plan(root, update);
  if (dryRun) return proposal;
  await fs.mkdir(root, { recursive: true });
  const lockPath = path.join(root, '.agent-team-install.lock');
  let lock;
  try { lock = await fs.open(lockPath, 'wx'); }
  catch (e) { if (e.code === 'EEXIST') throw new Error(`Installer lock exists: ${lockPath}. If no installer is running, remove this file and retry.`); throw e; }
  try {
    // Recheck under the lock so simultaneous invocations cannot overwrite each other.
    proposal = await plan(root, update);
    await fs.mkdir(path.join(root, '.agents', 'skills'), { recursive: true });
    await fs.mkdir(path.join(root, '.claude', 'skills'), { recursive: true });
    for (const item of proposal.actions) {
      if (item.action !== 'unchanged') {
        const staging = path.join(root, `.agent-team-stage-${crypto.randomUUID()}`);
        await fs.cp(item.source, staging, { recursive: true, errorOnExist: true, force: false });
        await fs.writeFile(path.join(staging, MARKER), JSON.stringify({ owner: OWNER, name: item.name, version: proposal.version, hashes: item.incoming }, null, 2) + '\n', { flag: 'wx' });
        let backup;
        if (item.action === 'update') {
          const backupRoot = path.join(root, '.agent-team-backups');
          await fs.mkdir(backupRoot, { recursive: true });
          backup = path.join(backupRoot, `${item.name}-${crypto.randomUUID()}`);
          await fs.rename(item.target, backup);
        }
        try { await fs.rename(staging, item.target); }
        catch (e) {
          if (backup) await fs.rename(backup, item.target);
          throw new Error(`Could not install ${item.name}; staged files retained at ${staging}: ${e.message}`);
        }
        if (backup) item.backup = backup;
      }
      if (item.createLink) await fs.symlink(item.target, item.link, process.platform === 'win32' ? 'junction' : 'dir');
    }
    return proposal;
  } finally {
    await lock.close();
    await fs.unlink(lockPath);
  }
}

async function cli() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('--root requires a home-directory path');
      options.root = args[++i];
    } else if (args[i] === '--dry-run') options.dryRun = true;
    else if (args[i] === '--update') options.update = true;
    else if (args[i] === '--help') {
      console.log('node scripts/install.cjs [--root HOME] [--dry-run] [--update]\nInstalls six shared skills and links Claude to them. Existing unrelated or edited profiles are never overwritten.');
      return;
    } else throw new Error(`Unknown argument: ${args[i]}`);
  }
  const result = await install(options);
  console.log(`${options.dryRun ? 'Preview' : 'Completed'} agent-team ${result.version}`);
  for (const item of result.actions) {
    console.log(`${item.name}: ${item.action}${item.createLink ? ', link Claude' : ''}${item.backup ? `; backup: ${item.backup}` : ''}`);
  }
}
if (require.main === module) cli().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { install, hashes };
