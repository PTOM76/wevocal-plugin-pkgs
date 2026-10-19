// GitHub Issue Form のプラグイン登録入力を検証する。
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { parseIssueSubmission } from './issue-submission.mjs'

const validBody = `### 種別
wam

### ID
com.example.reverb

### プラグイン名
Example Reverb

### 作者
Example Audio

### 配布リンク
https://example.com/reverb.js

### 説明（任意）
A reverb plugin.

### 作者サイト（任意）
https://example.com

### カテゴリ（カンマ区切り、任意）
Effect, Reverb
`

test('converts a valid Issue Form into catalog metadata', () => {
  assert.deepEqual(parseIssueSubmission(validBody), {
    type: 'wam',
    id: 'com.example.reverb',
    name: 'Example Reverb',
    author: 'Example Audio',
    url: 'https://example.com/reverb.js',
    description: 'A reverb plugin.',
    website: 'https://example.com',
    categories: ['Effect', 'Reverb'],
  })
})

test('rejects issues without all submission fields', () => {
  assert.throws(() => parseIssueSubmission(validBody.replace('### 種別\nwam\n\n', '')), /項目が不足/)
})

test('rejects multiline field values', () => {
  assert.throws(() => parseIssueSubmission(validBody.replace('Example Reverb\n', 'Example Reverb\nforged line\n')), /複数行の入力/)
})

test('rejects duplicated fields', () => {
  assert.throws(() => parseIssueSubmission(`${validBody}\n### ID\nother.id\n`), /不明または重複/)
})

test('rejects IDs outside the safe filename format', () => {
  assert.throws(() => parseIssueSubmission(validBody.replace('com.example.reverb', '../plugin')), /ID は小文字/)
})

test('rejects non-HTTPS author websites', () => {
  assert.throws(() => parseIssueSubmission(validBody.replace('https://example.com\n\n### カテゴリ', 'http://example.com\n\n### カテゴリ')), /作者サイトには HTTPS/)
})

test('rejects distribution URLs that do not match the selected type', () => {
  assert.throws(() => parseIssueSubmission(validBody.replace('reverb.js', 'reverb.dll')), /認証情報のない HTTPS/)
})

test('rejects distribution URLs containing credentials', () => {
  assert.throws(() => parseIssueSubmission(validBody.replace('https://example.com/reverb.js', 'https://user:pass@example.com/reverb.js')), /認証情報のない HTTPS/)
})

test('reads a GitHub issue event file from the CLI', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'plugin-submission-'))
  try {
    const eventPath = join(directory, 'event.json')
    await writeFile(eventPath, JSON.stringify({ issue: { body: validBody } }))
    const scriptPath = fileURLToPath(new URL('./issue-submission.mjs', import.meta.url))
    const result = spawnSync(process.execPath, [scriptPath, eventPath], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout).id, 'com.example.reverb')
  } finally {
    await unlink(join(directory, 'event.json'))
    await rmdir(directory)
  }
})
