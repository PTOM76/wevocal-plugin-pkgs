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
