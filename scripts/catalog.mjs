import { appendFile, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { provesOwnership, remoteVersion } from './remote.mjs'

// テストでは CATALOG_ROOT で作業用のフォルダーに向ける
const root = process.env.CATALOG_ROOT ?? resolve(import.meta.dirname, '..')
const pluginsDir = resolve(root, 'data/plugins')
const indexPath = resolve(root, 'data/index.json')
const wamIndexPath = resolve(root, 'data/wam.json')
const sourceUrl = 'https://www.webaudiomodules.com/community/plugins.json'
const wamBase = 'https://www.webaudiomodules.com/community/plugins/'
const validTypes = new Set(['wam', 'manifest', 'vst'])

function assertHttps(value, label) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} には HTTPS の絶対 URL が必要です`)
  }
  if (url.protocol !== 'https:') throw new Error(`${label} は HTTPS にしてください`)
  return url.href
}

function fileId(value) {
  const id = String(value).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  if (!/^[a-z0-9][a-z0-9._-]{1,95}$/.test(id)) throw new Error(`プラグイン ID が不正です: ${value}`)
  return id
}

// 登録した投稿者の GitHub ユーザー名。更新できるのはこの人だけ
function githubLogin(value) {
  const login = String(value).trim()
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login)) throw new Error(`GitHub ユーザー名が不正です: ${value}`)
  return login
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('プラグイン情報はオブジェクトである必要があります')
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string' || typeof raw.author !== 'string') {
    throw new Error('プラグイン情報には id、name、author が必要です')
  }
  if (!validTypes.has(raw.type)) throw new Error(`未対応のプラグイン種別です: ${raw.type}`)
  const url = assertHttps(raw.url, '配布 URL')
  if (raw.type === 'wam' && !url.toLowerCase().split(/[?#]/, 1)[0].endsWith('.js')) {
    throw new Error('WAM プラグインの URL は .js で終わる必要があります')
  }
  if (raw.type === 'manifest' && !url.toLowerCase().split(/[?#]/, 1)[0].endsWith('.json')) {
    throw new Error('マニフェストの URL は .json で終わる必要があります')
  }
  if (raw.type === 'vst' && !url.toLowerCase().split(/[?#]/, 1)[0].endsWith('.dll')) {
    throw new Error('VST の URL は .dll で終わる必要があります')
  }
  return {
    id: fileId(raw.id),
    sourceId: String(raw.sourceId ?? raw.id),
    name: raw.name.trim(),
    author: raw.author.trim(),
    ...(typeof raw.version === 'string' && raw.version ? { version: raw.version } : {}),
    description: String(raw.description ?? ''),
    type: raw.type,
    url,
    website: String(raw.website ?? '').slice(0, 500),
    thumbnail: raw.thumbnail ? assertHttps(raw.thumbnail, 'サムネイル URL') : '',
    categories: Array.isArray(raw.categories) ? raw.categories.map(String) : [],
    keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
    installable: raw.installable !== false,
    ...(raw.source ? { source: raw.source } : {}),
    ...(raw.submitter ? { submitter: githubLogin(raw.submitter) } : {}),
  }
}

async function writeEntry(raw) {
  const entry = normalizeEntry(raw)
  await mkdir(pluginsDir, { recursive: true })
  await writeFile(resolve(pluginsDir, `${entry.id}.json`), `${JSON.stringify(entry, null, 2)}\n`)
  return entry
}

async function withConcurrency(items, concurrency, task) {
  const results = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index])
    }
  }))
  return results
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`取得に失敗しました（${response.status}）: ${url}`)
  return response.json()
}

async function syncWam() {
  const upstream = await fetchJson(sourceUrl)
  if (!Array.isArray(upstream)) throw new Error('WAM カタログの応答が配列ではありません')
  const records = await withConcurrency(upstream, 5, async (item) => {
    if (typeof item.identifier !== 'string' || typeof item.path !== 'string' || item.path.startsWith('/') || item.path.split('/').includes('..')) {
      throw new Error(`WAM カタログの項目が不正です: ${JSON.stringify(item)}`)
    }
    const url = new URL(item.path, wamBase).href
    const descriptorUrl = new URL('descriptor.json', url).href
    let installable = false
    let version = ''
    try {
      const descriptor = await fetchJson(descriptorUrl)
      installable = descriptor.isInstrument !== true && descriptor.hasAudioInput !== false && descriptor.hasAudioOutput !== false
      version = typeof descriptor.version === 'string' ? descriptor.version : ''
    } catch (error) {
      console.warn(`WAM の descriptor を確認できませんでした（${item.identifier}）: ${error instanceof Error ? error.message : String(error)}`)
      installable = false
    }
    return {
      id: item.identifier,
      sourceId: item.identifier,
      name: item.name,
      author: item.vendor || 'Unknown',
      version,
      description: item.description || '',
      type: 'wam',
      url,
      website: item.website || '',
      thumbnail: item.thumbnail ? new URL(item.thumbnail, wamBase).href : '',
      categories: Array.isArray(item.category) ? item.category : [],
      keywords: Array.isArray(item.keywords) ? item.keywords : [],
      installable,
      source: { name: 'WAM Community', catalog: sourceUrl, descriptor: descriptorUrl },
    }
  })
  const entries = records.map(normalizeEntry)
  const ids = new Set()
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`WAM プラグイン ID が重複しています: ${entry.id}`)
    ids.add(entry.id)
  }
  await mkdir(pluginsDir, { recursive: true })
  for (const entry of entries) {
    await writeFile(resolve(pluginsDir, `${entry.id}.json`), `${JSON.stringify(entry, null, 2)}\n`)
  }
  for (const name of await readdir(pluginsDir)) {
    if (!name.endsWith('.json') || ids.has(name.slice(0, -5))) continue
    const previous = JSON.parse(await readFile(resolve(pluginsDir, name), 'utf8'))
    if (previous.source?.catalog === sourceUrl) await unlink(resolve(pluginsDir, name))
  }
  console.log(`WAM エントリーを ${entries.length} 件取り込みました（WeVocal FX 対応: ${entries.filter((entry) => entry.installable).length} 件）。`)
}

async function addEntry(input) {
  const entry = normalizeEntry(input)
  try {
    await readFile(resolve(pluginsDir, `${entry.id}.json`), 'utf8')
    throw new Error(`プラグイン ID はすでに登録されています: ${entry.id}`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await writeEntry(entry.version ? entry : await withRemoteVersion(entry))
  console.log(`登録しました: ${entry.id}`)
}

async function readEntry(id) {
  try {
    return JSON.parse(await readFile(resolve(pluginsDir, `${fileId(id)}.json`), 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

async function reportAction(action) {
  console.log({ updated: '更新しました', claimed: '投稿者を紐づけて更新しました' }[action] ?? '登録しました')
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `action=${action}
`)
}

// 配布元が公開している版があれば、それをエントリーの版にする（取れなければ今の版を残す）
async function withRemoteVersion(entry) {
  const version = await remoteVersion(entry)
  return version ? { ...entry, version } : entry
}

// 掲載申請。新しい ID は投稿者つきで登録する。登録済みの ID は、同じ投稿者のときだけ更新する。
// 投稿者が未設定の ID は、登録されている配布リンクの持ち主だと確認できたときだけ、その人を投稿者にして更新する（'claimed'）
async function submitEntry(input, login) {
  const submitter = githubLogin(login)
  const entry = normalizeEntry(input)
  const current = await readEntry(entry.id)
  if (!current) {
    await writeEntry(await withRemoteVersion({ ...entry, submitter }))
    return 'added'
  }
  let action = 'updated'
  if (!current.submitter) {
    if (!(await provesOwnership(current, submitter))) {
      throw new Error(`投稿者が未設定のプラグインを紐づけるには、登録されている配布リンクの持ち主であることの確認が必要です: ${entry.id}`)
    }
    action = 'claimed'
  } else if (current.submitter.toLowerCase() !== submitter.toLowerCase()) {
    throw new Error(`このプラグインを更新できるのは登録した投稿者だけです: ${entry.id}`)
  }
  const { type, name, author, url, description, website, categories } = entry
  await writeEntry(await withRemoteVersion({ ...current, type, name, author, url, description, website, categories, submitter: current.submitter ?? submitter }))
  return action
}

// メンテナーの更新。key=value で渡した項目だけを書き換える（空の値は無視する）
const editableKeys = new Set(['type', 'name', 'author', 'url', 'description', 'website', 'thumbnail', 'version', 'categories', 'submitter'])
async function updateEntry(id, pairs) {
  const current = await readEntry(id)
  if (!current) throw new Error(`登録されていないプラグイン ID です: ${id}`)
  const changes = {}
  for (const pair of pairs) {
    const index = pair.indexOf('=')
    const key = pair.slice(0, index)
    const value = pair.slice(index + 1)
    if (index < 1 || !editableKeys.has(key)) throw new Error(`更新できない項目です: ${pair}`)
    if (value === '') continue
    changes[key] = key === 'categories' ? value.split(',').map((item) => item.trim()).filter(Boolean) : value
  }
  const next = { ...current, ...changes }
  // 版を指定していなければ、配布元の版を取り直す
  await writeEntry('version' in changes ? next : await withRemoteVersion(next))
}

// 配布元の版を取り直す。ID を渡さないときは、公式の WAM コミュニティから取り込んだもの（同期で更新される）以外のすべて
async function refreshVersions(id) {
  const files = id ? [`${fileId(id)}.json`] : (await readdir(pluginsDir)).filter((name) => name.endsWith('.json'))
  let changed = 0
  for (const name of files) {
    const current = await readEntry(name.slice(0, -5))
    if (!current) throw new Error(`登録されていないプラグイン ID です: ${id}`)
    if (!id && current.source?.catalog === sourceUrl) continue
    const next = await withRemoteVersion(current)
    if (next.version === current.version) continue
    await writeEntry(next)
    console.log(`${current.id}: ${current.version ?? '（なし）'} -> ${next.version}`)
    changed += 1
  }
  console.log(`版を更新したもの: ${changed} 件`)
}

// 投稿者本人による取り下げ。登録した投稿者と同じ GitHub ユーザーのときだけ消す
async function withdrawEntry(id, login) {
  const submitter = githubLogin(login)
  const current = await readEntry(id)
  if (!current) throw new Error(`登録されていないプラグイン ID です: ${id}`)
  if (!current.submitter || current.submitter.toLowerCase() !== submitter.toLowerCase()) {
    throw new Error(`このプラグインを取り下げられるのは登録した投稿者だけです: ${id}`)
  }
  await removeEntry(id)
}

async function removeEntry(id) {
  if (!(await readEntry(id))) throw new Error(`登録されていないプラグイン ID です: ${id}`)
  await unlink(resolve(pluginsDir, `${fileId(id)}.json`))
}

async function writeIndex(path, entries) {
  let updatedAt = new Date().toISOString()
  try {
    const previous = JSON.parse(await readFile(path, 'utf8'))
    if (JSON.stringify(previous.plugins) === JSON.stringify(entries) && typeof previous.updatedAt === 'string') updatedAt = previous.updatedAt
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await writeFile(path, `${JSON.stringify({ version: 1, updatedAt, plugins: entries }, null, 2)}\n`)
}

async function buildIndex() {
  const files = (await readdir(pluginsDir)).filter((name) => name.endsWith('.json')).sort()
  const entries = await Promise.all(files.map(async (name) => normalizeEntry(JSON.parse(await readFile(resolve(pluginsDir, name), 'utf8')))))
  const ids = new Set()
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`プラグイン ID が重複しています: ${entry.id}`)
    ids.add(entry.id)
  }
  const wamEntries = entries.filter((entry) => entry.type === 'wam')
  await Promise.all([
    writeIndex(indexPath, entries),
    writeIndex(wamIndexPath, wamEntries),
  ])
  console.log(`プラグイン ${entries.length} 件を検証しました（WAM: ${wamEntries.length} 件）。`)
}

const [command, ...args] = process.argv.slice(2)
if (command === 'sync-wam') {
  await syncWam()
  await buildIndex()
} else if (command === 'add') {
  const [type, id, name, author, url, description = '', website = '', categories = '', submitter = ''] = args
  await addEntry({
    type,
    id,
    name,
    author,
    url,
    description,
    website,
    categories: categories.split(',').map((value) => value.trim()).filter(Boolean),
    ...(submitter ? { submitter } : {}),
  })
  await buildIndex()
} else if (command === 'add-json') {
  const [path] = args
  if (!path) throw new Error('登録する JSON ファイルのパスが必要です')
  await addEntry(JSON.parse(await readFile(path, 'utf8')))
  await buildIndex()
} else if (command === 'submit-json') {
  const [path, login] = args
  if (!path || !login) throw new Error('使い方: node scripts/catalog.mjs submit-json <JSON> <GitHub ユーザー名>')
  await reportAction(await submitEntry(JSON.parse(await readFile(path, 'utf8')), login))
  await buildIndex()
} else if (command === 'update') {
  const [id, ...pairs] = args
  if (!id) throw new Error('使い方: node scripts/catalog.mjs update <ID> [項目=値 ...]')
  await updateEntry(id, pairs)
  await buildIndex()
  console.log(`更新しました: ${id}`)
} else if (command === 'refresh-versions') {
  await refreshVersions(args[0])
  await buildIndex()
} else if (command === 'remove') {
  const [id] = args
  if (!id) throw new Error('使い方: node scripts/catalog.mjs remove <ID>')
  await removeEntry(id)
  await buildIndex()
  console.log(`削除しました: ${id}`)
} else if (command === 'withdraw') {
  const [id, login] = args
  if (!id || !login) throw new Error('使い方: node scripts/catalog.mjs withdraw <ID> <GitHub ユーザー名>')
  await withdrawEntry(id, login)
  await buildIndex()
  console.log(`取り下げました: ${id}`)
} else if (command === 'validate') {
  await buildIndex()
} else {
  throw new Error('使い方: node scripts/catalog.mjs <sync-wam|add|add-json|submit-json|update|remove|withdraw|refresh-versions|validate>')
}
