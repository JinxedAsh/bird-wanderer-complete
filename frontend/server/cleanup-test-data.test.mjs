import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';
import { createApp } from './auth.mjs';
import { verifyBackup } from '../scripts/backup.mjs';
import { cleanupTestData } from '../scripts/cleanup-test-data.mjs';

const origin = 'http://localhost:3000';
const team = ['Anirudh', 'Ayush', 'Sourabh', 'Uday', 'Ravi'];
const discovery = { catalogue: async () => ({ species: [{ id: 'comkin1', name: 'Common Kingfisher', scientificName: 'Alcedo atthis' }], hotspots: [{ id: 'L123', name: 'Synthetic Wetland' }] }) };

// Builds a temporary database through the real API: five team accounts, one
// EVAL record and an EVAL CHAT, test accounts that interact with the team, a
// burst of empty accounts, an expired session and an orphan photo file.
async function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'bird-cleanup-test-'));
  const dbPath = join(directory, 'app.sqlite'), mediaPath = join(directory, 'media');
  let clock = Date.parse('2026-10-01T09:00:00Z');
  const app = createApp({ dbPath, mediaPath, discovery, now: () => clock, rateLimit: 1000 });
  const server = app.app.listen(0, '127.0.0.1');
  await new Promise((done) => server.once('listening', done));
  t.after(async () => {
    if (server.listening) await new Promise((done) => server.close(done));
    if (app.db.isOpen) app.db.close();
    assert.equal(dirname(directory), tmpdir());
    rmSync(directory, { recursive: true, force: true });
  });
  const call = async (path, body, cookie, { method = body === undefined ? 'GET' : 'POST', type = 'application/json' } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, { method, headers: { origin, ...(cookie ? { cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': type }) }, body: body === undefined ? undefined : type === 'application/json' ? JSON.stringify(body) : body });
    const data = await response.json().catch(() => ({}));
    assert.ok(response.ok, `${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
    return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const people = {};
  const register = async (key, name, email, minutesLater = 60) => {
    clock += minutesLater * 60 * 1000;
    const result = await call('auth/register', { name, email, password: 'synthetic-cleanup-passphrase' });
    people[key] = { id: result.data.user.id, cookie: result.cookie, email };
  };
  const image = await sharp({ create: { width: 12, height: 12, channels: 3, background: '#2d5a27' } }).jpeg().toBuffer();
  const post = async (key, notes, visibility = 'public') => {
    const media = (await call('observations/media', image, people[key].cookie, { type: 'image/jpeg' })).data.media;
    return (await call('observations', { mediaId: media.id, speciesId: 'comkin1', hotspotId: 'L123', observedAt: '2026-09-30T07:00', notes, visibility, hideExactLocation: true }, people[key].cookie)).data.observation;
  };
  await register('anirudh', 'Anirudh Jain', 'anirudh.jain@group13.sep');
  await register('ayush', 'Ayush Pandey', 'ayush.pandey@group13.sep');
  await register('sourabh', 'Sourabh', 'sourabh@group13.sep');
  await register('uday', 'Uday', 'uday@group13.sep');
  await register('ravi', 'Ravi Ranjan', 'ravi.ranjan@group13.sep');
  // A teammate's own throwaway account: flagged by its name, but the keep-list wins.
  await register('ayushTest', 'Ayush test', 'ayush.second@group13.sep');
  await register('qa', 'QA Tester', 'qa1@example.test');
  await register('demo', 'Demo Birder', 'demo@example.com');
  await register('viewer', 'Viewer', 'viewer.profile@group13.sep');
  await register('burstA', 'Kiran', 'kiran@group13.sep', 300);
  await register('burstB', 'Meena', 'meena@group13.sep', 1);
  await register('burstC', 'Arjun', 'arjun@group13.sep', 1);
  await register('lonely', 'Neha', 'neha@group13.sep', 300);

  const teamPost = await post('anirudh', 'Kingfisher at the reed bed.');
  const evalPrivate = await post('anirudh', 'EVAL PRIVATE record for the testing report.', 'private');
  const evalChat = await post('anirudh', 'EVAL CHAT attachment.', 'public');
  const qaPost = await post('qa', 'qa upload');
  await post('demo', 'demo upload');
  await call(`observations/social/posts/${teamPost.id}/comments`, { text: 'test comment' }, people.qa.cookie);
  await call(`observations/social/posts/${teamPost.id}/like`, { liked: true }, people.qa.cookie, { method: 'PUT' });
  await call(`observations/social/follows/${people.anirudh.id}`, { following: true }, people.qa.cookie, { method: 'PUT' });
  await call(`observations/social/follows/${people.qa.id}`, { following: true }, people.ayush.cookie, { method: 'PUT' });
  const qaChat = (await call('observations/chat', { personId: people.ayush.id }, people.qa.cookie)).data.conversation;
  await call(`observations/chat/${qaChat.id}/messages`, { clientId: randomUUID(), text: 'hello from qa' }, people.qa.cookie);
  // A teammate also shares the EVAL CHAT post with another teammate.
  const teamChat = (await call('observations/chat', { personId: people.uday.id }, people.anirudh.cookie)).data.conversation;
  const shared = (await call(`observations/chat/${teamChat.id}/messages`, { clientId: randomUUID(), text: 'look at this', observationId: evalChat.id }, people.anirudh.cookie)).data.message;
  const evalThread = (await call('observations/chat', { personId: people.viewer.id }, people.anirudh.cookie)).data.conversation;
  await call(`observations/chat/${evalThread.id}/messages`, { clientId: randomUUID(), text: 'EVAL CHAT', observationId: evalChat.id }, people.anirudh.cookie);
  await new Promise((done) => server.close(done));
  app.db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run('a'.repeat(64), people.ravi.id, Date.parse('2026-01-01T00:00:00Z'));
  mkdirSync(mediaPath, { recursive: true });
  writeFileSync(join(mediaPath, '00000000-0000-4000-8000-000000000000.jpg'), 'orphan');
  app.db.close();
  return { directory, dbPath, mediaPath, people, teamPost, evalPrivate, evalChat, qaPost, shared, now: () => clock };
}

const quiet = () => {};
const run = (f, name, options = {}) => cleanupTestData({ databasePath: f.dbPath, mediaPath: f.mediaPath, backupDirectory: join(f.directory, name), serverStopped: true, now: f.now, log: quiet, ...options });
const ids = (db, sql) => db.prepare(sql).all().map((row) => Object.values(row)[0]);

test('cleanup refuses unsafe runs: no backup, server not confirmed stopped, or --apply without a keep-list', async (t) => {
  const f = await fixture(t);
  await assert.rejects(run(f, 'b1', { serverStopped: false }), /Stop every app process/);
  await assert.rejects(run(f, 'b2', { backupDirectory: undefined }), /backup directory/);
  await assert.rejects(run(f, 'b3', { apply: true }), /keep-list/);
  await assert.rejects(run(f, 'b4', { apply: true, keep: [' '] }), /keep-list/);
  // A keep-list that protects nobody would remove every flagged account; refuse
  // when that would leave the database with no accounts at all.
  const db = new DatabaseSync(f.dbPath);
  const realIds = ids(db, "SELECT id FROM users WHERE email NOT LIKE '%example%'");
  db.prepare(`UPDATE users SET email = id || '@example.test' WHERE id IN (${realIds.map(() => '?').join(',')})`).run(...realIds);
  db.close();
  await assert.rejects(run(f, 'b5', { apply: true, keep: ['Nobody'], includeEval: true }), /every account/);
  const after = new DatabaseSync(f.dbPath);
  assert.equal(after.prepare('SELECT COUNT(*) AS count FROM users').get().count, 13);
  after.close();
});

test('dry run takes a verified backup, reports every account with its activity and changes nothing', async (t) => {
  const f = await fixture(t);
  const lines = [];
  const result = await run(f, 'dry-backup', { log: (...parts) => lines.push(parts.join(' ')) });
  assert.equal(result.applied, false);
  assert.equal(verifyBackup(result.backup).counts.users, 13);
  assert.deepEqual(result.after, result.before);
  const byName = Object.fromEntries(result.accounts.map((account) => [account.name, account]));
  assert.equal(result.accounts.length, 13);
  assert.equal(byName['QA Tester'].action, 'delete');
  assert.match(byName['QA Tester'].reasons.join(), /example\.test/);
  assert.deepEqual({ posts: byName['QA Tester'].activity.posts, comments: byName['QA Tester'].activity.comments, following: byName['QA Tester'].activity.following, messages: byName['QA Tester'].activity.messages }, { posts: 1, comments: 1, following: 1, messages: 1 });
  assert.match(byName['Demo Birder'].reasons.join(), /demo/);
  for (const name of ['Kiran', 'Meena', 'Arjun']) assert.match(byName[name].reasons.join(), /within 10 min, no activity/);
  // An inactive account on its own is reported but not flagged.
  assert.equal(byName.Neha.likelyTest, false);
  assert.equal(byName.Neha.action, 'keep');
  // Both sides of the EVAL CHAT stay by default.
  assert.equal(byName.Viewer.action, 'keep (EVAL)');
  assert.equal(byName['Anirudh Jain'].action, 'keep');
  // Without a keep-list a teammate's own throwaway would be marked.
  assert.equal(byName['Ayush test'].action, 'delete');
  assert.ok(lines.some((line) => line.includes('Dry run: nothing was changed')));
  assert.ok(lines.some((line) => line.includes('EVAL records: 2')));
  const db = new DatabaseSync(f.dbPath);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 13);
  db.close();
  assert.ok(existsSync(join(f.mediaPath, '00000000-0000-4000-8000-000000000000.jpg')));
});

test('--apply removes test accounts and everything that depends on them in one go, keeps the team and EVAL records, and is repeatable', async (t) => {
  const f = await fixture(t);
  const filesBefore = readdirSync(f.mediaPath).length;
  const result = await run(f, 'apply-backup', { apply: true, keep: team });
  assert.equal(result.applied, true);
  assert.ok(verifyBackup(result.backup));
  const db = new DatabaseSync(f.dbPath);
  try {
    const names = ids(db, 'SELECT name FROM users ORDER BY name');
    assert.deepEqual(names, ['Anirudh Jain', 'Ayush Pandey', 'Ayush test', 'Neha', 'Ravi Ranjan', 'Sourabh', 'Uday', 'Viewer']);
    const gone = [f.people.qa.id, f.people.demo.id, f.people.burstA.id, f.people.burstB.id, f.people.burstC.id];
    // Count rows still pointing at a deleted account; {ids} expands to its placeholders.
    const remaining = (sql) => {
      const list = gone.map(() => '?').join(',');
      const parts = sql.split('{ids}');
      return db.prepare(parts.join(list)).get(...Array(parts.length - 1).fill(gone).flat()).count;
    };
    for (const sql of [
      'SELECT COUNT(*) AS count FROM observations WHERE user_id IN ({ids})', 'SELECT COUNT(*) AS count FROM media WHERE user_id IN ({ids})',
      'SELECT COUNT(*) AS count FROM comments WHERE user_id IN ({ids})', 'SELECT COUNT(*) AS count FROM post_likes WHERE user_id IN ({ids})',
      'SELECT COUNT(*) AS count FROM follows WHERE follower_id IN ({ids}) OR followed_id IN ({ids})', 'SELECT COUNT(*) AS count FROM messages WHERE sender_id IN ({ids})',
      'SELECT COUNT(*) AS count FROM conversations WHERE person_low IN ({ids}) OR person_high IN ({ids})', 'SELECT COUNT(*) AS count FROM sessions WHERE user_id IN ({ids})',
      'SELECT COUNT(*) AS count FROM social_notifications WHERE actor_id IN ({ids}) OR user_id IN ({ids})',
    ]) assert.equal(remaining(sql), 0, sql);
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
    // The team's own records and EVAL records stay by default.
    assert.ok(db.prepare('SELECT 1 FROM observations WHERE id = ?').get(f.teamPost.id));
    assert.ok(db.prepare('SELECT 1 FROM observations WHERE id = ?').get(f.evalPrivate.id));
    assert.ok(db.prepare('SELECT 1 FROM observations WHERE id = ?').get(f.evalChat.id));
    assert.equal(db.prepare('SELECT observation_id AS id FROM messages WHERE id = ?').get(f.shared.id).id, f.evalChat.id);
    assert.equal(db.prepare('SELECT 1 FROM observations WHERE id = ?').get(f.qaPost.id), undefined);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM comments').get().count, 0);
    // Expired sessions are gone; current team sessions are not.
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sessions WHERE expires_at <= ?').get(f.now()).count, 0);
    assert.ok(db.prepare('SELECT COUNT(*) AS count FROM sessions WHERE user_id = ?').get(f.people.anirudh.id).count > 0);
    // Photo files of deleted posts and the orphan file are removed; the rest match the database.
    const files = readdirSync(f.mediaPath).sort();
    assert.deepEqual(files, ids(db, 'SELECT filename FROM media ORDER BY filename'));
    assert.equal(files.length, filesBefore - 3);
  } finally { db.close(); }
  assert.equal(result.after.users, 8);
  assert.equal(result.before.users, 13);
  // Running again finds nothing new to delete and changes nothing.
  const again = await run(f, 'apply-again', { apply: true, keep: team });
  assert.equal(again.deletedAccounts, 0);
  assert.equal(again.removedFiles, 0);
  assert.deepEqual(again.after, again.before);
  assert.deepEqual(again.after, result.after);
});

test('--include-eval also removes EVAL records (and their photos) from kept accounts and lifts the EVAL protection', async (t) => {
  const f = await fixture(t);
  const result = await run(f, 'eval-backup', { apply: true, keep: team, includeEval: true });
  const db = new DatabaseSync(f.dbPath);
  try {
    assert.equal(db.prepare('SELECT 1 FROM observations WHERE id IN (?, ?)').get(f.evalPrivate.id, f.evalChat.id), undefined);
    assert.ok(db.prepare('SELECT 1 FROM observations WHERE id = ?').get(f.teamPost.id));
    assert.ok(db.prepare('SELECT 1 FROM users WHERE id = ?').get(f.people.anirudh.id));
    assert.equal(db.prepare('SELECT 1 FROM users WHERE id = ?').get(f.people.viewer.id), undefined);
    // The teammates' chat stays; its attachment now shows as no longer available.
    assert.equal(db.prepare('SELECT observation_id AS id FROM messages WHERE id = ?').get(f.shared.id).id, null);
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
    assert.deepEqual(readdirSync(f.mediaPath).sort(), ids(db, 'SELECT filename FROM media ORDER BY filename'));
  } finally { db.close(); }
  assert.equal(result.accounts.find((account) => account.name === 'Viewer').action, 'delete');
});

test('the command line defaults to a dry run and passes the keep-list through', async (t) => {
  const f = await fixture(t);
  const cli = fileURLToPath(new URL('../scripts/cleanup-test-data.mjs', import.meta.url));
  const env = { ...process.env, DOTENV_CONFIG_PATH: join(f.directory, 'unused.env'), DATABASE_PATH: f.dbPath, MEDIA_PATH: f.mediaPath };
  const refused = spawnSync(process.execPath, [cli, '--backup', join(f.directory, 'cli-0')], { env, encoding: 'utf8' });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /server-stopped/);
  const dry = spawnSync(process.execPath, [cli, '--backup', join(f.directory, 'cli-1'), '--server-stopped'], { env, encoding: 'utf8' });
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /Backup created and verified/);
  assert.match(dry.stdout, /QA Tester <qa1@example.test>/);
  assert.match(dry.stdout, /Dry run: nothing was changed/);
  const applied = spawnSync(process.execPath, [cli, '--backup', join(f.directory, 'cli-2'), '--server-stopped', '--apply', '--keep', team.join(',')], { env, encoding: 'utf8' });
  assert.equal(applied.status, 0, applied.stderr);
  assert.match(applied.stdout, /Deleted 5 account\(s\)/);
});
