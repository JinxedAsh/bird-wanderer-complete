// Removes leftover test accounts (and everything that depends on them) from a
// Bird Wanderer database. Safe by default:
//   - every run first takes and verifies a backup with scripts/backup.mjs;
//   - without --apply it only prints a report and changes nothing;
//   - --apply also needs a keep-list, and kept accounts always win;
//   - EVAL PRIVATE / PUBLIC / CHAT / RETRY records stay unless --include-eval.
// Run it with the app stopped. Running it again is harmless.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, lstatSync, readdirSync, realpathSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackup, verifyBackup } from './backup.mjs';

const mediaFilePattern = /^[a-f0-9-]{36}\.jpg$/;
const evalPattern = /\bEVAL[\s_-]*(PRIVATE|PUBLIC|CHAT|RETRY)\b/i;
// Reserved / throwaway email domains that never belong to a real team member.
const testDomain = /(^|\.)(example(\.(com|org|net))?|test|invalid|localhost|local|mailinator\.com|yopmail\.com)$/i;
const testWord = /(^|[^a-z])(test|tests|testing|tester\d*|demo|eval|qa|temp|tmp|dummy|fake|sample|fixture|synthetic|disposable|throwaway|backup)(?=$|[^a-z])/i;
// Role names used by the walkthroughs and scripted demos (docs/test-cases/run-demo.mjs).
const walkthroughName = /^(owner|viewer|birder|observer|sender|recipient|other|second|someone)(\s*\d+)?$/i;
const burstWindow = 10 * 60 * 1000;
const burstSize = 3;

const words = (value) => value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function tableExists(db, name) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

function counter(db) {
  const cache = new Map();
  return (table, sql, id) => {
    if (!tableExists(db, table)) return 0;
    if (!cache.has(sql)) cache.set(sql, db.prepare(sql));
    return cache.get(sql).get(id)?.count ?? 0;
  };
}

function totals(db, mediaPath) {
  const tables = ['users', 'observations', 'media', 'comments', 'post_likes', 'follows', 'conversations', 'messages', 'alert_subscriptions', 'sighting_alerts', 'social_notifications', 'sessions'];
  const result = Object.fromEntries(tables.map((table) => [table, tableExists(db, table) ? db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count : 0]));
  result.mediaFiles = existsSync(mediaPath) ? readdirSync(mediaPath).filter((file) => mediaFilePattern.test(file)).length : 0;
  return result;
}

// True when a keep-list entry names this account: exact id/email, full name,
// email local part, or a whole word of the name ("Ravi" keeps "Ravi Ranjan").
function matchesKeep(user, entry) {
  const value = entry.trim().toLowerCase();
  if (!value) return false;
  const email = user.email.toLowerCase();
  return user.id.toLowerCase() === value || email === value || email.split('@')[0] === value
    || user.name.trim().toLowerCase() === value || words(user.name).includes(value)
    || words(email.split('@')[0]).includes(value);
}

function analyse(db, { keep, includeEval, extraDelete }) {
  const count = counter(db);
  const users = db.prepare('SELECT id, name, email, created_at AS createdAt FROM users ORDER BY created_at, id').all();
  const evalObservations = tableExists(db, 'observations')
    ? db.prepare('SELECT id, user_id AS userId, notes FROM observations').all().filter((row) => evalPattern.test(row.notes))
    : [];
  const evalIds = new Set(evalObservations.map((row) => row.id));
  // The other person in an EVAL CHAT conversation is part of that evidence too.
  const evalPeople = new Set(evalObservations.map((row) => row.userId));
  if (tableExists(db, 'messages') && tableExists(db, 'conversations')) {
    for (const row of db.prepare('SELECT c.person_low AS a, c.person_high AS b, m.text, m.observation_id AS observationId FROM messages m JOIN conversations c ON c.id = m.conversation_id').all()) {
      if (evalPattern.test(row.text) || evalIds.has(row.observationId)) { evalPeople.add(row.a); evalPeople.add(row.b); }
    }
  }
  const accounts = users.map((user) => {
    const activity = {
      posts: count('observations', 'SELECT COUNT(*) AS count FROM observations WHERE user_id=?', user.id),
      photos: count('media', 'SELECT COUNT(*) AS count FROM media WHERE user_id=?', user.id),
      comments: count('comments', 'SELECT COUNT(*) AS count FROM comments WHERE user_id=?', user.id),
      likes: count('post_likes', 'SELECT COUNT(*) AS count FROM post_likes WHERE user_id=?', user.id),
      following: count('follows', 'SELECT COUNT(*) AS count FROM follows WHERE follower_id=?', user.id),
      followers: count('follows', 'SELECT COUNT(*) AS count FROM follows WHERE followed_id=?', user.id),
      messages: count('messages', 'SELECT COUNT(*) AS count FROM messages WHERE sender_id=?', user.id),
      saves: count('discovery_saves', 'SELECT COUNT(*) AS count FROM discovery_saves WHERE user_id=?', user.id),
    };
    const reasons = [];
    const domain = user.email.split('@')[1] || '';
    if (testDomain.test(domain)) reasons.push(`test email domain (${domain})`);
    const word = testWord.exec(`${user.name} ${user.email.split('@')[0]}`);
    if (word) reasons.push(`name/email contains "${word[2].toLowerCase()}"`);
    if (walkthroughName.test(user.name.trim())) reasons.push('walkthrough role name');
    const neighbours = users.filter((other) => Math.abs(other.createdAt - user.createdAt) <= burstWindow).length;
    const inactive = Object.values(activity).every((value) => value === 0);
    if (neighbours >= burstSize && inactive) reasons.push(`created with ${neighbours - 1} other accounts within 10 min, no activity`);
    const kept = keep.some((entry) => matchesKeep(user, entry));
    const named = extraDelete.some((entry) => [user.id, user.email].map((value) => value.toLowerCase()).includes(entry.trim().toLowerCase()));
    if (named) reasons.push('named with --delete');
    const evalProtected = !includeEval && evalPeople.has(user.id);
    const likelyTest = reasons.length > 0;
    const action = kept ? 'keep' : evalProtected && likelyTest ? 'keep (EVAL)' : likelyTest ? 'delete' : 'keep';
    return { ...user, activity, inactive, reasons, likelyTest, kept, evalProtected, action };
  });
  return { accounts, evalObservations };
}

function printReport(accounts, evalObservations, log) {
  log(`\nAccounts (${accounts.length}):`);
  log('created (UTC)     | action      | posts photos comments follows(out/in) messages | name <email> | why it looks like test data');
  for (const account of accounts) {
    const a = account.activity;
    const created = new Date(account.createdAt).toISOString().slice(0, 16).replace('T', ' ');
    const counts = `${String(a.posts).padStart(5)} ${String(a.photos).padStart(6)} ${String(a.comments).padStart(8)} ${`${a.following}/${a.followers}`.padStart(15)} ${String(a.messages).padStart(8)}`;
    log(`${created} | ${account.action.padEnd(11)} | ${counts} | ${account.name} <${account.email}> | ${account.reasons.join('; ') || (account.inactive ? 'no activity (not flagged on its own)' : '-')}`);
  }
  log(`\nEVAL records: ${evalObservations.length}${evalObservations.length ? ` (${[...new Set(evalObservations.map((row) => row.notes.match(evalPattern)[0].toUpperCase()))].join(', ')})` : ''}`);
}

export async function cleanupTestData({
  databasePath, mediaPath, backupDirectory, serverStopped = false, apply = false,
  keep = [], includeEval = false, extraDelete = [], now = Date.now, log = console.log,
}) {
  if (!serverStopped) throw new Error('Stop every app process using this database/media, then confirm with --server-stopped.');
  if (!backupDirectory) throw new Error('Choose a NEW backup directory outside the repository with --backup <directory>.');
  if (apply && !keep.some((entry) => entry.trim())) throw new Error('--apply needs a keep-list, for example --keep "Anirudh,Ayush,Sourabh,Uday,Ravi".');
  if (!existsSync(databasePath)) throw new Error(`Database not found: ${databasePath}`);
  mediaPath = existsSync(mediaPath) ? realpathSync(mediaPath) : resolve(mediaPath);

  // (a) Backup first, and refuse to continue unless it verifies.
  const backup = await createBackup({ databasePath, mediaPath, destination: backupDirectory, serverStopped: true });
  verifyBackup(backup.directory);
  log(`Backup created and verified: ${backup.directory}`);

  const db = new DatabaseSync(databasePath);
  try {
    db.exec('PRAGMA foreign_keys = ON');
    const before = totals(db, mediaPath);
    const { accounts, evalObservations } = analyse(db, { keep, includeEval, extraDelete });
    printReport(accounts, evalObservations, log);
    for (const entry of keep) if (entry.trim() && !accounts.some((account) => matchesKeep(account, entry))) log(`Warning: keep-list entry "${entry.trim()}" matches no account.`);
    const doomed = accounts.filter((account) => account.action === 'delete');
    const evalToRemove = includeEval ? evalObservations.filter((row) => !doomed.some((account) => account.id === row.userId)) : [];
    if (doomed.length === accounts.length && accounts.length) throw new Error('Refusing to delete every account. Check the keep-list.');
    const expiredSessions = tableExists(db, 'sessions') ? db.prepare('SELECT COUNT(*) AS count FROM sessions WHERE expires_at <= ?').get(now()).count : 0;
    const referenced = new Set(tableExists(db, 'media') ? db.prepare('SELECT filename FROM media').all().map((row) => row.filename) : []);
    const orphanFiles = existsSync(mediaPath) ? readdirSync(mediaPath).filter((file) => mediaFilePattern.test(file) && !referenced.has(file) && lstatSync(join(mediaPath, file)).isFile()) : [];

    log(`\nPlan: delete ${doomed.length} account(s)${includeEval ? `, ${evalToRemove.length} EVAL record(s) from kept accounts` : ''}, ${expiredSessions} expired session(s), ${orphanFiles.length} orphan photo file(s).`);
    log('Before:', JSON.stringify(before));
    if (!apply) {
      log('\nDry run: nothing was changed. Re-run with --apply --keep "<names>" to delete the accounts marked "delete".');
      return { applied: false, backup: backup.directory, accounts, before, after: before };
    }

    // (d) Everything that depends on the removed accounts goes in one transaction.
    const ids = doomed.map((account) => account.id);
    const filesToRemove = [];
    db.exec('BEGIN IMMEDIATE');
    try {
      const mediaFor = db.prepare('SELECT filename FROM media WHERE user_id = ?');
      const mediaOf = db.prepare('SELECT m.filename FROM media m JOIN observations o ON o.media_id = m.id WHERE o.id = ?');
      for (const id of ids) filesToRemove.push(...mediaFor.all(id).map((row) => row.filename));
      for (const row of evalToRemove) filesToRemove.push(...mediaOf.all(row.id).map((media) => media.filename));
      // Observations do not cascade to their media row, so remove posts first,
      // then photos, then the accounts (which cascades comments, likes, follows,
      // conversations, messages, subscriptions, notifications and sessions).
      const deleteObservation = db.prepare('DELETE FROM observations WHERE id = ?');
      const deleteMediaRow = db.prepare('DELETE FROM media WHERE id = ?');
      for (const row of evalToRemove) {
        const mediaId = db.prepare('SELECT media_id AS id FROM observations WHERE id = ?').get(row.id)?.id;
        deleteObservation.run(row.id);
        if (mediaId) deleteMediaRow.run(mediaId);
      }
      if (ids.length) {
        const placeholders = ids.map(() => '?').join(',');
        db.prepare(`DELETE FROM observations WHERE user_id IN (${placeholders})`).run(...ids);
        db.prepare(`DELETE FROM media WHERE user_id IN (${placeholders})`).run(...ids);
        db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...ids);
      }
      if (tableExists(db, 'sessions')) db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
      if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Foreign-key check failed; nothing was deleted.');
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    // Files are removed only after the database change is committed. Anything
    // left behind (for example a locked file) is an orphan for the next run.
    let removedFiles = 0;
    for (const file of [...new Set([...filesToRemove, ...orphanFiles])]) {
      if (!mediaFilePattern.test(file)) continue;
      try { unlinkSync(join(mediaPath, file)); removedFiles++; }
      catch (error) { if (error.code !== 'ENOENT') log(`Warning: could not remove ${file} (${error.code}). It will be removed on the next run.`); }
    }
    const after = totals(db, mediaPath);
    log(`\nDeleted ${ids.length} account(s), removed ${removedFiles} photo file(s).`);
    log('After: ', JSON.stringify(after));
    return { applied: true, backup: backup.directory, accounts, before, after, deletedAccounts: ids.length, removedFiles };
  } finally { db.close(); }
}

function parseArgs(argv) {
  const options = { keep: [], extraDelete: [] };
  const list = (value) => (value || '').split(',').map((entry) => entry.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => { if (i + 1 >= argv.length) throw new Error(`${arg} needs a value.`); return argv[++i]; };
    if (arg === '--') continue;
    else if (arg === '--apply') options.apply = true;
    else if (arg === '--server-stopped') options.serverStopped = true;
    else if (arg === '--include-eval') options.includeEval = true;
    else if (arg === '--backup') options.backupDirectory = value();
    else if (arg === '--keep') options.keep.push(...list(value()));
    else if (arg === '--delete') options.extraDelete.push(...list(value()));
    else if (arg === '--database') options.databasePath = value();
    else if (arg === '--media') options.mediaPath = value();
    else throw new Error(`Unknown option ${arg}.`);
  }
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await import('dotenv/config');
    const root = fileURLToPath(new URL('../', import.meta.url));
    const options = parseArgs(process.argv.slice(2));
    await cleanupTestData({
      ...options,
      databasePath: options.databasePath || process.env.DATABASE_PATH || join(root, 'data/bird-wanderer.sqlite'),
      mediaPath: options.mediaPath || process.env.MEDIA_PATH || join(root, 'data/media'),
    });
  } catch (error) {
    console.error(`Cleanup stopped: ${error.message}`);
    console.error('Usage: pnpm cleanup:test-data --backup <new-directory-outside-repo> --server-stopped [--apply --keep "Anirudh,Ayush,Sourabh,Uday,Ravi"] [--include-eval] [--delete "email-or-id,..."]');
    process.exitCode = 1;
  }
}
