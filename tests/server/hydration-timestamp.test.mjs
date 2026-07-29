import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bewegungserinnerung-hydration-'));
const tempFile = path.join(tempDir, 'Trinkdaten.csv');

test('hydration writes and reads ISO timestamps', async (t) => {
  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const { readHydrationEntries, writeHydrationEntries } = await import('../../server/storage.mjs');

  const now = new Date('2026-07-22T09:30:00.000Z');
  const written = writeHydrationEntries(tempFile, [
    { date: now.toISOString(), hydrationMl: 250 },
  ]);

  assert.equal(written[0].date, now.toISOString());

  const rows = readHydrationEntries(tempFile);
  assert.equal(rows[0].date, now.toISOString());
  assert.equal(rows[0].hydrationMl, 250);
});
