import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
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
  const entry = await writeEntry(input)
  console.log(`登録しました: ${entry.id}`)
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
  const [type, id, name, author, url, description = '', website = '', categories = ''] = args
  await addEntry({
    type,
    id,
    name,
    author,
    url,
    description,
    website,
    categories: categories.split(',').map((value) => value.trim()).filter(Boolean),
  })
  await buildIndex()
} else if (command === 'validate') {
  await buildIndex()
} else {
  throw new Error('使い方: node scripts/catalog.mjs <sync-wam|add|validate>')
}
