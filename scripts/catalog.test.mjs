// 掲載申請の登録と更新（投稿者の確認）、メンテナーの更新と削除を確かめる。
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const script = fileURLToPath(new URL('./catalog.mjs', import.meta.url))
const submission = {
  type: 'wam',
  id: 'net.example.reverb',
  name: 'Example Reverb',
  author: 'Example',
  url: 'https://example.com/reverb.js',
  description: 'first',
  website: '',
  categories: ['Effect'],
}

async function withCatalog(run) {
  const root = await mkdtemp(join(tmpdir(), 'catalog-'))
  const catalog = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: { ...process.env, CATALOG_ROOT: root, GITHUB_OUTPUT: '' } })
  const submit = async (entry, login) => {
    const path = join(root, 'submission.json')
    await writeFile(path, JSON.stringify(entry))
    return catalog('submit-json', path, login)
  }
  const read = async () => JSON.parse(await readFile(join(root, 'data/plugins/net.example.reverb.json'), 'utf8'))
  try {
    await run({ root, catalog, submit, read })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('a new submission is registered with its submitter', async () => {
  await withCatalog(async ({ submit, read }) => {
    assert.equal((await submit(submission, 'alice')).status, 0)
    assert.equal((await read()).submitter, 'alice')
  })
})

test('the same submitter can update an entry and keeps its other fields', async () => {
  await withCatalog(async ({ submit, read, catalog }) => {
    await submit(submission, 'alice')
    catalog('update', submission.id, 'thumbnail=https://example.com/shot.png')
    const result = await submit({ ...submission, url: 'https://example.com/reverb2.js', description: 'second' }, 'Alice')
    assert.equal(result.status, 0, result.stderr)
    const entry = await read()
    assert.equal(entry.url, 'https://example.com/reverb2.js')
    assert.equal(entry.description, 'second')
    assert.equal(entry.thumbnail, 'https://example.com/shot.png')
    assert.equal(entry.submitter, 'alice')
  })
})

test('another user cannot update an entry', async () => {
  await withCatalog(async ({ submit, read }) => {
    await submit(submission, 'alice')
    const result = await submit({ ...submission, url: 'https://evil.example/reverb.js' }, 'mallory')
    assert.notEqual(result.status, 0)
    assert.equal((await read()).url, submission.url)
  })
})

test('an entry without a submitter cannot be taken over by a submission', async () => {
  await withCatalog(async ({ catalog, submit }) => {
    catalog('add', 'wam', submission.id, submission.name, submission.author, submission.url)
    assert.notEqual((await submit(submission, 'mallory')).status, 0)
  })
})

test('maintainers can set the submitter, update fields and remove an entry', async () => {
  await withCatalog(async ({ catalog, read, root }) => {
    catalog('add', 'wam', submission.id, submission.name, submission.author, submission.url)
    assert.equal(catalog('update', submission.id, 'submitter=alice', 'name=Renamed', 'description=').status, 0)
    const entry = await read()
    assert.equal(entry.submitter, 'alice')
    assert.equal(entry.name, 'Renamed')
    assert.equal(catalog('update', submission.id, 'unknown=1').status !== 0, true)
    assert.equal(catalog('remove', submission.id).status, 0)
    assert.equal(JSON.parse(await readFile(join(root, 'data/index.json'), 'utf8')).plugins.length, 0)
  })
})
