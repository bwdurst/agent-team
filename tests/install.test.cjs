'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { install } = require('../scripts/install.cjs');
const names = require('../manifest.json').skills;

async function home(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-team-test-'));
  t.after(async () => {
    // Unlink junctions themselves before deleting only our verified temporary tree.
    for (const name of names) {
      const link = path.join(directory, '.claude', 'skills', name);
      const info = await fs.lstat(link).catch(() => null);
      if (info?.isSymbolicLink()) await fs.unlink(link);
    }
    const skillRoot = path.join(directory, '.agents', 'skills');
    const info = await fs.lstat(skillRoot).catch(() => null);
    if (info?.isSymbolicLink()) await fs.unlink(skillRoot);
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('agent-team-test-'));
    await fs.rm(directory, { recursive: true });
  });
  return directory;
}
const profile = (root, name = 'kira') => path.join(root, '.agents', 'skills', name);

test('dry run creates no files; fresh install shares exact instructions with Claude', async t => {
  const root = await home(t);
  const preview = await install({ root, dryRun: true });
  assert.equal(preview.actions.length, 6);
  assert.deepEqual(await fs.readdir(root), []);
  await install({ root });
  for (const name of names) {
    const linked = path.join(root, '.claude', 'skills', name);
    assert.equal(await fs.realpath(linked), await fs.realpath(profile(root, name)));
    assert.match(await fs.readFile(path.join(linked, 'SKILL.md'), 'utf8'), new RegExp(`name: ${name}`));
  }
  const repeated = await install({ root });
  assert.ok(repeated.actions.every(x => x.action === 'unchanged' && !x.createLink));
});

test('local edits are shared immediately and never overwritten, including --update', async t => {
  const root = await home(t);
  await install({ root });
  const file = path.join(profile(root), 'SKILL.md');
  await fs.appendFile(file, '\nA personal customization.\n');
  assert.match(await fs.readFile(path.join(root, '.claude', 'skills', 'kira', 'SKILL.md'), 'utf8'), /personal customization/);
  await assert.rejects(install({ root, update: true }), /locally modified/);
  assert.match(await fs.readFile(file, 'utf8'), /personal customization/);
});

test('unrelated profiles are preserved and preflight prevents partial installation', async t => {
  const root = await home(t);
  await fs.mkdir(profile(root, 'pixie'), { recursive: true });
  await fs.writeFile(path.join(profile(root, 'pixie'), 'SKILL.md'), 'Existing user profile');
  await assert.rejects(install({ root, update: true }), /not managed/);
  assert.equal(await fs.readFile(path.join(profile(root, 'pixie'), 'SKILL.md'), 'utf8'), 'Existing user profile');
  assert.deepEqual(await fs.readdir(path.dirname(profile(root))), ['pixie']);
});

test('changed package version requires --update and backs up prior managed content', async t => {
  const root = await home(t);
  await install({ root });
  const markerFile = path.join(profile(root), '.agent-team.json');
  const marker = JSON.parse(await fs.readFile(markerFile, 'utf8'));
  marker.version = '0.0.1';
  await fs.writeFile(markerFile, JSON.stringify(marker));
  await assert.rejects(install({ root }), /--update/);
  const result = await install({ root, update: true });
  const kira = result.actions.find(x => x.name === 'kira');
  assert.equal(kira.action, 'update');
  assert.equal(JSON.parse(await fs.readFile(path.join(kira.backup, '.agent-team.json'), 'utf8')).version, '0.0.1');
  assert.equal(JSON.parse(await fs.readFile(markerFile, 'utf8')).version, result.version);
  assert.equal(await fs.realpath(path.join(root, '.claude', 'skills', 'kira')), await fs.realpath(profile(root)));
});

test('existing ordinary Claude skills are preserved without any shared profiles written', async t => {
  const root = await home(t);
  await fs.mkdir(path.join(root, '.claude', 'skills', 'sage'), { recursive: true });
  await assert.rejects(install({ root }), /Existing Claude profile/);
  await assert.rejects(fs.access(path.join(root, '.agents')), { code: 'ENOENT' });
});

test('linked installation parent and concurrent installer lock are refused', async t => {
  const root = await home(t);
  const outside = await home(t);
  await fs.mkdir(path.join(root, '.agents'));
  await fs.symlink(outside, path.join(root, '.agents', 'skills'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(install({ root }), /ordinary directory/);
  assert.deepEqual(await fs.readdir(outside), []);
  await fs.unlink(path.join(root, '.agents', 'skills'));
  await fs.writeFile(path.join(root, '.agent-team-install.lock'), 'locked');
  await assert.rejects(install({ root }), /Installer lock exists/);
  await assert.rejects(fs.access(profile(root)), { code: 'ENOENT' });
});

test('links to unrelated Claude destinations are not retargeted', async t => {
  const root = await home(t);
  const outside = await home(t);
  await fs.mkdir(path.join(root, '.claude', 'skills'), { recursive: true });
  await fs.symlink(outside, path.join(root, '.claude', 'skills', 'kira'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(install({ root }), /points elsewhere/);
  assert.equal(await fs.realpath(path.join(root, '.claude', 'skills', 'kira')), await fs.realpath(outside));
});
