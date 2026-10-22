// 配布元から情報を取る（版の確認と、所有者の確認）。Actions のカタログ更新で使う。

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' })
  if (!response.ok) throw new Error(`取得に失敗しました（${response.status}）: ${url}`)
  // 別のオリジンへ転送された先の内容は、配布元のものとは見なさない
  if (new URL(response.url || url).origin !== new URL(url).origin) throw new Error(`別のオリジンへ転送されました: ${url}`)
  const text = await response.text()
  if (text.length > 1_000_000) throw new Error(`大きすぎます: ${url}`)
  return JSON.parse(text)
}

// 種別ごとに、配布元が自分の情報を置いている JSON の場所（WAM は同じフォルダーの descriptor.json、マニフェストは URL そのもの）
function metadataUrl(entry) {
  if (entry.type === 'wam') return new URL('descriptor.json', entry.url).href
  if (entry.type === 'manifest') return entry.url
  return null
}

// 配布元が公開している版。取れなければ null（今の版を残す）
export async function remoteVersion(entry) {
  const url = metadataUrl(entry)
  if (!url) return null
  try {
    const metadata = await fetchJson(url)
    return typeof metadata.version === 'string' && metadata.version.length <= 40 ? metadata.version : null
  } catch (error) {
    console.warn(`版を確認できませんでした: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

// URL が、その GitHub ユーザーのものだと分かる場所か（<ユーザー>.github.io、github.com/<ユーザー>/…、raw.githubusercontent.com/<ユーザー>/…）
export function urlBelongsToLogin(value, login) {
  const url = new URL(value)
  const user = login.toLowerCase()
  if (url.protocol !== 'https:') return false
  if (url.hostname.toLowerCase() === `${user}.github.io`) return true
  if (['github.com', 'raw.githubusercontent.com'].includes(url.hostname.toLowerCase())) {
    return url.pathname.split('/')[1]?.toLowerCase() === user
  }
  return false
}

// 投稿者が、登録済みのプラグインの持ち主であることの確認。登録されている配布リンク（申請で渡された新しい URL ではない）が
// ① その人の GitHub のもの、または ② 配布元の descriptor.json（マニフェスト）に githubOwner としてその人の名前が書いてある
export async function provesOwnership(entry, login) {
  if (urlBelongsToLogin(entry.url, login)) return true
  const url = metadataUrl(entry)
  if (!url) return false
  try {
    const metadata = await fetchJson(url)
    return typeof metadata.githubOwner === 'string' && metadata.githubOwner.toLowerCase() === login.toLowerCase()
  } catch {
    return false
  }
}

const typeByExtension = { '.js': 'wam', '.json': 'manifest', '.dll': 'vst' }

// 配布リンクの拡張子から種別を決める
export function typeFromUrl(value) {
  let path
  try {
    path = new URL(value).pathname.toLowerCase()
  } catch {
    return ''
  }
  return typeByExtension[Object.keys(typeByExtension).find((extension) => path.endsWith(extension))] ?? ''
}

const httpsOrEmpty = (value, base) => {
  try {
    const url = new URL(value, base)
    return url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}
const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const kindCategory = { fx: 'Effect', instrument: 'Instrument', tool: 'Tool', analyzer: 'Analyzer' }

// 配布元の情報（WAM の descriptor.json、WeVocal のマニフェスト）から、カタログの項目を取り出す。取れなければ null
async function readMetadata(type, url) {
  const location = metadataUrl({ type, url })
  if (!location) return null
  try {
    const metadata = await fetchJson(location)
    if (type === 'manifest') {
      const lang = metadata.lang?.en_us ?? metadata.lang?.ja_jp ?? {}
      return {
        id: text(metadata.id, 96),
        name: text(lang[metadata.name] ?? metadata.name, 120),
        author: text(metadata.author, 120),
        description: text(metadata.description, 500),
        version: text(metadata.version, 40),
        categories: kindCategory[metadata.kind] ? [kindCategory[metadata.kind]] : [],
      }
    }
    return {
      id: text(metadata.identifier, 96),
      name: text(metadata.name, 120),
      author: text(metadata.vendor, 120),
      description: text(metadata.description, 500),
      website: httpsOrEmpty(text(metadata.website, 500)),
      thumbnail: httpsOrEmpty(text(metadata.thumbnail, 500), url),
      version: text(metadata.version, 40),
      keywords: Array.isArray(metadata.keywords) ? metadata.keywords.filter((item) => typeof item === 'string').slice(0, 20) : [],
      categories: [metadata.isInstrument === true ? 'Instrument' : 'Effect'],
    }
  } catch (error) {
    console.warn(`配布元の情報を読めませんでした: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

// 掲載申請の入力を、配布元の情報で補う。優先は、入力 > 配布元の情報 > 今のエントリー（更新のとき）。
// 必要なのは配布リンクだけで、種別は拡張子、ID、名前、作者などは配布元の情報から決まる
export async function completeSubmission(input, current = null) {
  const url = input.url
  const type = input.type || typeFromUrl(url)
  if (!type) throw new Error('配布 URL の拡張子（.js、.json、.dll）から種別を決められません。種別を入力してください')
  const meta = (await readMetadata(type, url)) ?? {}
  const pick = (key, empty = '') => input[key] || meta[key] || current?.[key] || empty
  // カテゴリは、入力 > 今のエントリー > 配布元から推測した値（WAM は Effect か Instrument だけ）の順。更新で、手で付けたカテゴリが消えないようにする
  const categories = input.categories?.length ? input.categories : current?.categories?.length ? current.categories : (meta.categories ?? [])
  return {
    ...(current ?? {}),
    type,
    id: input.id || current?.id || meta.id,
    name: pick('name'),
    author: pick('author'),
    url,
    description: pick('description'),
    website: pick('website'),
    thumbnail: meta.thumbnail || current?.thumbnail || '',
    keywords: meta.keywords?.length ? meta.keywords : (current?.keywords ?? []),
    categories,
    ...(meta.version || current?.version ? { version: meta.version || current.version } : {}),
  }
}
