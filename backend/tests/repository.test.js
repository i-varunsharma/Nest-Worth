import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/*
  Tests for the shared owned-record repository that debts, goals, assets and
  family members are built on. Run with: npm test

  The ownership rule is the one that matters: a user can never read, change or
  delete another user's row, whatever id they pass.
*/

const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'nestworth-repo-'));
process.env.NESTWORTH_DB_FILE = path.join(temporaryFolder, 'test.db');

const db = (await import('../src/database/db.js')).default;
const { familyRepository } = await import('../src/repositories/familyRepository.js');
const { debtRepository } = await import('../src/repositories/debtRepository.js');

const now = new Date().toISOString();
const insertUser = db.prepare('INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)');
const owner = insertUser.run('Owner', 'owner@example.com', now).lastInsertRowid;
const stranger = insertUser.run('Stranger', 'stranger@example.com', now).lastInsertRowid;

test.after(() => {
  fs.rmSync(temporaryFolder, { recursive: true, force: true });
});

const maa = { name: 'Maa', relation: 'parent', monthlySupport: 7000, hasHealthCover: true };


test('create returns the stored record in app shape', () => {
  const created = familyRepository.create(owner, maa);

  assert.equal(created.name, 'Maa');
  assert.equal(created.monthlySupport, 7000);
  assert.ok(created.id > 0);
});


test('booleans are stored as 1 and 0 and read back as booleans', () => {
  // SQLite has no boolean type and better-sqlite3 refuses true and false.
  const created = familyRepository.create(owner, { ...maa, name: 'Papa', hasHealthCover: false });

  const row = db.prepare('SELECT has_health_cover FROM family_members WHERE id = ?').get(created.id);

  assert.equal(row.has_health_cover, 0);
  assert.equal(created.hasHealthCover, false);
});


test('list only returns the owner\'s rows, in the defined order', () => {
  debtRepository.create(owner, { name: 'Cheap', kind: 'home', principal: 100, annualRate: 8, emi: 50 });
  debtRepository.create(owner, { name: 'Dear', kind: 'credit_card', principal: 100, annualRate: 40, emi: 50 });
  debtRepository.create(stranger, { name: 'Theirs', kind: 'personal', principal: 100, annualRate: 20, emi: 50 });

  const names = debtRepository.list(owner).map((debt) => {
    return debt.name;
  });

  assert.deepEqual(names, ['Dear', 'Cheap']);
});


test('another user cannot find, update or remove a row by its id', () => {
  const created = familyRepository.create(owner, { ...maa, name: 'Nani' });

  assert.equal(familyRepository.findById(stranger, created.id), null);
  assert.equal(familyRepository.update(stranger, created.id, { ...maa, name: 'Changed' }), null);
  assert.equal(familyRepository.remove(stranger, created.id), false);

  assert.equal(familyRepository.findById(owner, created.id).name, 'Nani');
});


test('update and remove work for the owner', () => {
  const created = familyRepository.create(owner, { ...maa, name: 'Dadi' });

  const updated = familyRepository.update(owner, created.id, { ...maa, name: 'Dadi', monthlySupport: 9000 });
  assert.equal(updated.monthlySupport, 9000);

  assert.equal(familyRepository.remove(owner, created.id), true);
  assert.equal(familyRepository.findById(owner, created.id), null);
});


test('count counts only the owner\'s rows', () => {
  const before = familyRepository.count(stranger);

  familyRepository.create(stranger, { ...maa, name: 'Someone' });

  assert.equal(familyRepository.count(stranger), before + 1);
});
