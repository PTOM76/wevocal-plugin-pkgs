// ChreeIDのOIDC PKCEログインと、GitHub Issue用の暗号化証明を扱う。
const issuer = 'https://id.wikichree.com'
const sessionPrefix = 'wevocal-chreeid:'

function toBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

function randomBase64Url(size) {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(size)))
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
}

function callbackUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href
}

export async function beginChreeidLogin(issue, nonce) {
  const clientId = import.meta.env.VITE_CHREEID_CLIENT_ID
  if (!clientId) throw new Error('ChreeIDのクライアントIDが設定されていません')
  if (!/^[1-9]\d{0,9}$/.test(issue) || !/^[A-Za-z0-9_-]{43}$/.test(nonce)) {
    throw new Error('Issue用の認証リンクが正しくありません')
  }

  const state = randomBase64Url(32)
  const verifier = randomBase64Url(64)
  const redirectUri = callbackUrl()
  sessionStorage.setItem(`${sessionPrefix}${state}`, JSON.stringify({ issue, nonce, verifier, redirectUri }))

  const authorization = new URL(`${issuer}/oauth/authorize`)
  authorization.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid',
    state,
    nonce,
    code_challenge: toBase64Url(await sha256(verifier)),
    code_challenge_method: 'S256',
  }).toString()
  window.location.assign(authorization.href)
}

export async function completeChreeidLogin(search) {
  const params = new URLSearchParams(search)
  const state = params.get('state')
  const code = params.get('code')
  if (!state) throw new Error('ChreeIDからの認証応答にstateがありません')

  const storageKey = `${sessionPrefix}${state}`
  const saved = sessionStorage.getItem(storageKey)
  sessionStorage.removeItem(storageKey)
  if (!saved) throw new Error('認証状態が見つからないか、すでに使用されています')
  const pending = JSON.parse(saved)
  if (params.has('error')) throw new Error(`ChreeID認証に失敗しました: ${params.get('error_description') || params.get('error')}`)
  if (!code) throw new Error('ChreeIDから認可コードが返されませんでした')

  const response = await fetch(`${issuer}/oauth/token`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: import.meta.env.VITE_CHREEID_CLIENT_ID,
      code,
      redirect_uri: pending.redirectUri,
      code_verifier: pending.verifier,
    }),
  })
  const tokens = await response.json()
  if (!response.ok) throw new Error(tokens.error_description || `ChreeIDのトークン交換に失敗しました（HTTP ${response.status}）`)
  if (typeof tokens.id_token !== 'string' || tokens.id_token.length > 8192) {
    throw new Error('ChreeIDから有効なIDトークンが返されませんでした')
  }

  return { issue: pending.issue, idToken: tokens.id_token }
}

export async function encryptChreeidProof(idToken) {
  const publicKey = import.meta.env.VITE_CHREEID_LINK_PUBLIC_KEY
  if (!publicKey) throw new Error('ChreeID連携用の公開鍵が設定されていません')

  const recipientKey = await crypto.subtle.importKey(
    'spki',
    fromBase64(publicKey),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
  const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(idToken),
  )
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey)
  const encryptedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipientKey, rawAesKey)
  const envelope = {
    key: toBase64Url(new Uint8Array(encryptedKey)),
    iv: toBase64Url(iv),
    data: toBase64Url(new Uint8Array(ciphertext)),
  }
  return toBase64Url(new TextEncoder().encode(JSON.stringify(envelope)))
}
