// 掲載申請の登録と更新（投稿者の確認）、メンテナーの更新と削除を確かめる。
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const script = fileURLToPath(new URL('./catalog.mjs', import.meta.url))
const testFetch = new URL('./test-fetch.mjs', import.meta.url).href
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
  // 通信はせず、remote に入れた URL の JSON だけを返す（入れていない URL は 404）
  const remote = {}
  const catalog = (...args) => spawnSync(process.execPath, ['--import', testFetch, script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, CATALOG_ROOT: root, GITHUB_OUTPUT: '', TEST_FETCH_STRICT: '1', TEST_FETCH_MAP: JSON.stringify(remote) },
  })
  const submit = async (entry, login) => {
    const path = join(root, 'submission.json')
    await writeFile(path, JSON.stringify(entry))
    return catalog('submit-json', path, login)
  }
  const read = async () => JSON.parse(await readFile(join(root, 'data/plugins/net.example.reverb.json'), 'utf8'))
  try {
    await run({ root, catalog, submit, read, remote })
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

test('only the submitter can withdraw an entry', async () => {
  await withCatalog(async ({ submit, catalog, read }) => {
    await submit(submission, 'alice')
    assert.notEqual(catalog('withdraw', submission.id, 'mallory').status, 0)
    assert.equal((await read()).id, submission.id)
    assert.equal(catalog('withdraw', submission.id, 'ALICE').status, 0)
    await assert.rejects(read())
  })
})

test('an entry without a submitter cannot be withdrawn by a user', async () => {
  await withCatalog(async ({ catalog, read }) => {
    catalog('add', 'wam', submission.id, submission.name, submission.author, submission.url)
    assert.notEqual(catalog('withdraw', submission.id, 'mallory').status, 0)
    assert.equal((await read()).id, submission.id)
  })
})

const descriptorUrl = 'https://example.com/descriptor.json'

test('the version is taken from the distributor descriptor on submit and update', async () => {
  await withCatalog(async ({ submit, read, remote }) => {
    remote[descriptorUrl] = { version: '1.0.0' }
    await submit(submission, 'alice')
    assert.equal((await read()).version, '1.0.0')
    remote[descriptorUrl] = { version: '1.0.1' }
    await submit(submission, 'alice')
    assert.equal((await read()).version, '1.0.1')
    // 取れなくなったときは、今の版を残す
    delete remote[descriptorUrl]
    await submit({ ...submission, description: 'changed' }, 'alice')
    assert.equal((await read()).version, '1.0.1')
  })
})

test('an entry without a submitter can be linked when the descriptor names the GitHub owner', async () => {
  await withCatalog(async ({ catalog, submit, read, remote }) => {
    catalog('add', 'wam', submission.id, submission.name, submission.author, submission.url)
    assert.notEqual((await submit(submission, 'alice')).status, 0)
    remote[descriptorUrl] = { version: '2.0.0', githubOwner: 'Alice' }
    assert.notEqual((await submit(submission, 'mallory')).status, 0)
    assert.equal((await submit({ ...submission, description: 'linked' }, 'alice')).status, 0)
    const entry = await read()
    assert.equal(entry.submitter, 'alice')
    assert.equal(entry.description, 'linked')
    assert.equal(entry.version, '2.0.0')
  })
})

test('an entry hosted under the user GitHub can be linked by that user only', async () => {
  await withCatalog(async ({ catalog, submit, read }) => {
    const url = 'https://alice.github.io/reverb/index.js'
    catalog('add', 'wam', submission.id, submission.name, submission.author, url)
    assert.notEqual((await submit({ ...submission, url }, 'mallory')).status, 0)
    assert.equal((await submit({ ...submission, url }, 'alice')).status, 0)
    assert.equal((await read()).submitter, 'alice')
  })
})

test('ownership is checked against the registered URL, not the submitted one', async () => {
  await withCatalog(async ({ catalog, submit }) => {
    catalog('add', 'wam', submission.id, submission.name, submission.author, submission.url)
    const result = await submit({ ...submission, url: 'https://mallory.github.io/reverb/index.js' }, 'mallory')
    assert.notEqual(result.status, 0)
  })
})

test('maintainers can refresh versions from the distributor', async () => {
  await withCatalog(async ({ catalog, read, remote }) => {
    catalog('add', 'wam', submission.id, submission.name, submission.author, submission.url)
    assert.equal((await read()).version, undefined)
    remote[descriptorUrl] = { version: '3.1.4' }
    assert.equal(catalog('refresh-versions').status, 0)
    assert.equal((await read()).version, '3.1.4')
    remote[descriptorUrl] = { version: '3.1.5' }
    assert.equal(catalog('refresh-versions', submission.id).status, 0)
    assert.equal((await read()).version, '3.1.5')
    // 版を指定した更新は、配布元の版で上書きしない
    assert.equal(catalog('update', submission.id, 'version=9.9.9').status, 0)
    assert.equal((await read()).version, '9.9.9')
  })
})

const onlyUrl = { type: '', id: '', name: '', author: '', url: submission.url, description: '', website: '', categories: [] }
const descriptor = {
  identifier: 'net.example.reverb',
  name: 'Example Reverb',
  vendor: 'Example Audio',
  description: 'From the descriptor.',
  version: '1.2.3',
  website: 'https://example.com',
  thumbnail: 'shot.png',
  keywords: ['reverb'],
  isInstrument: false,
}

test('a submission with only the distribution link is filled in from descriptor.json', async () => {
  await withCatalog(async ({ submit, read, remote }) => {
    remote[descriptorUrl] = descriptor
    const result = await submit(onlyUrl, 'alice')
    assert.equal(result.status, 0, result.stderr)
    const entry = await read()
    assert.equal(entry.type, 'wam')
    assert.equal(entry.name, 'Example Reverb')
    assert.equal(entry.author, 'Example Audio')
    assert.equal(entry.description, 'From the descriptor.')
    assert.equal(entry.version, '1.2.3')
    assert.equal(entry.website, 'https://example.com/')
    assert.equal(entry.thumbnail, 'https://example.com/shot.png')
    assert.deepEqual(entry.categories, ['Effect'])
    assert.deepEqual(entry.keywords, ['reverb'])
    assert.equal(entry.submitter, 'alice')
  })
})

test('typed fields take priority, and an update keeps values that nothing else decides', async () => {
  await withCatalog(async ({ submit, read, remote }) => {
    remote[descriptorUrl] = descriptor
    await submit({ ...onlyUrl, name: 'My Name', categories: ['Reverb'] }, 'alice')
    let entry = await read()
    assert.equal(entry.name, 'My Name')
    assert.deepEqual(entry.categories, ['Reverb'])
    // 配布元の情報が取れなくなっても、更新で今の値が消えない
    delete remote[descriptorUrl]
    await submit({ ...onlyUrl, id: 'net.example.reverb' }, 'alice')
    entry = await read()
    assert.equal(entry.name, 'My Name')
    assert.equal(entry.description, 'From the descriptor.')
    assert.equal(entry.version, '1.2.3')
  })
})

test('a submission that cannot be completed is rejected', async () => {
  await withCatalog(async ({ submit }) => {
    assert.notEqual((await submit(onlyUrl, 'alice')).status, 0)
    assert.notEqual((await submit({ ...onlyUrl, url: 'https://example.com/plugin.bin' }, 'alice')).status, 0)
  })
})
