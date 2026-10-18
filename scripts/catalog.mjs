import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const pluginsDir = resolve(root, 'data/plugins')
const indexPath = resolve(root, 'data/index.json')
const sourceUrl = 'https://www.webaudiomodules.com/community/plugins.json'
const wamBase = 'https://www.webaudiomodules.com/community/plugins/'
const validTypes = new Set(['wam', 'manifest', 'vst'])

function assertHttps(value, label) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} must be an absolute HTTPS URL`)
  }
  if (url.protocol !== 'https:') throw new Error(`${label} must use HTTPS`)
  return url.href
}

function fileId(value) {
  const id = String(value).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  if (!/^[a-z0-9][a-z0-9._-]{1,95}$/.test(id)) throw new Error(`Invalid plugin id: ${value}`)
  return id
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Plugin entry must be an object')
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string' || typeof raw.author !== 'string') {
    throw new Error('Plugin entry requires id, name, and author')
  }
  if (!validTypes.has(raw.type)) throw new Error(`Unsupported plugin type: ${raw.type}`)
  const url = assertHttps(raw.url, 'url')
  if (raw.type === 'wam' && !url.toLowerCase().split(/[?#]/, 1)[0].endsWith('.js')) {
    throw new Error('WAM plugin URL must end in .js')
  }
  if (raw.type === 'manifest' && !url.toLowerCase().split(/[?#]/, 1)[0].endsWith('.json')) {
    throw new Error('Manifest URL must end in .json')
  }
  if (raw.type === 'vst' && !url.toLowerCase().split(/[?#]/, 1)[0].endsWith('.dll')) {
    throw new Error('VST URL must end in .dll')
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
    thumbnail: raw.thumbnail ? assertHttps(raw.thumbnail, 'thumbnail') : '',
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
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`)
  return response.json()
}

async function syncWam() {
  const upstream = await fetchJson(sourceUrl)
  if (!Array.isArray(upstream)) throw new Error('WAM catalog response is not an array')
  const records = await withConcurrency(upstream, 5, async (item) => {
    if (typeof item.identifier !== 'string' || typeof item.path !== 'string' || item.path.startsWith('/') || item.path.split('/').includes('..')) {
      throw new Error(`Invalid WAM catalog entry: ${JSON.stringify(item)}`)
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
      console.warn(`Could not inspect WAM descriptor for ${item.identifier}: ${error instanceof Error ? error.message : String(error)}`)
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
    if (ids.has(entry.id)) throw new Error(`Duplicate WAM plugin id: ${entry.id}`)
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
  console.log(`Imported ${entries.length} WAM entries (${entries.filter((entry) => entry.installable).length} compatible with WeVocal FX).`)
}

async function addEntry(input) {
  const entry = await writeEntry(input)
  console.log(`Registered ${entry.id}`)
}

async function buildIndex() {
  const files = (await readdir(pluginsDir)).filter((name) => name.endsWith('.json')).sort()
  const entries = []
  for (const name of files) {
    const entry = normalizeEntry(JSON.parse(await readFile(resolve(pluginsDir, name), 'utf8')))
    entries.push(entry)
  }
  const ids = new Set()
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`Duplicate plugin id: ${entry.id}`)
    ids.add(entry.id)
  }
  let updatedAt = new Date().toISOString()
  try {
    const previous = JSON.parse(await readFile(indexPath, 'utf8'))
    if (JSON.stringify(previous.plugins) === JSON.stringify(entries) && typeof previous.updatedAt === 'string') updatedAt = previous.updatedAt
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await writeFile(indexPath, `${JSON.stringify({ version: 1, updatedAt, plugins: entries }, null, 2)}\n`)
  console.log(`Validated ${entries.length} plugins.`)
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
  throw new Error('Usage: node scripts/catalog.mjs <sync-wam|add|validate>')
}
