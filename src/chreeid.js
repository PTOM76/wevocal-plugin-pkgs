// ChreeIDのOIDC PKCEログインと、GitHub Issue用の暗号化証明を扱う。
const issuer = 'https://id.wikichree.com'
const sessionPrefix = 'wevocal-chreeid:'
const accountStorageKey = 'wevocal-chreeid-account'

function toBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

function fromBase64Url(value) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  return fromBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
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

function requireClientId() {
  const clientId = import.meta.env.VITE_CHREEID_CLIENT_ID
  if (!clientId) throw new Error('ChreeIDのクライアントIDが設定されていません')
  return clientId
}

async function createAuthorizationUrl({ state, verifier, nonce }) {
  const clientId = requireClientId()
  const authorization = new URL(`${issuer}/oauth/authorize`)
  authorization.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callbackUrl(),
    scope: 'openid',
    state,
    nonce,
    code_challenge: toBase64Url(await sha256(verifier)),
    code_challenge_method: 'S256',
  }).toString()
  return authorization
}

export async function beginChreeidLogin(issue, nonce) {
  requireClientId()
  if (!/^[1-9]\d{0,9}$/.test(issue) || !/^[A-Za-z0-9_-]{43}$/.test(nonce)) {
    throw new Error('Issue用の認証リンクが正しくありません')
  }

  const state = randomBase64Url(32)
  const verifier = randomBase64Url(64)
  const redirectUri = callbackUrl()
  sessionStorage.setItem(`${sessionPrefix}${state}`, JSON.stringify({ kind: 'issue', issue, nonce, verifier, redirectUri }))

  const authorization = await createAuthorizationUrl({ state, verifier, nonce })
  window.location.assign(authorization.href)
}

export function isChreeidAccountCallback(search) {
  return new URLSearchParams(search).get('state')?.startsWith('account.') ?? false
}

export async function beginChreeidAccountLogin() {
  requireClientId()
  const state = `account.${randomBase64Url(32)}`
  const nonce = randomBase64Url(32)
  const verifier = randomBase64Url(64)
  const redirectUri = callbackUrl()
  sessionStorage.setItem(`${sessionPrefix}${state}`, JSON.stringify({ kind: 'account', nonce, verifier, redirectUri }))
  const authorization = await createAuthorizationUrl({ state, verifier, nonce })
  window.location.assign(authorization.href)
}

async function exchangeChreeidCode(search, expectedKind) {
  const params = new URLSearchParams(search)
  const state = params.get('state')
  const code = params.get('code')
  if (!state) throw new Error('ChreeIDからの認証応答にstateがありません')

  const storageKey = `${sessionPrefix}${state}`
  const saved = sessionStorage.getItem(storageKey)
  sessionStorage.removeItem(storageKey)
  if (!saved) throw new Error('認証状態が見つからないか、すでに使用されています')
  const pending = JSON.parse(saved)
  if (pending.kind !== expectedKind) throw new Error('ChreeID認証の用途が一致しません')
  if (params.has('error')) throw new Error(`ChreeID認証に失敗しました: ${params.get('error_description') || params.get('error')}`)
  if (!code) throw new Error('ChreeIDから認可コードが返されませんでした')
  const clientId = requireClientId()

  const response = await fetch(`${issuer}/oauth/token`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
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

  return { pending, idToken: tokens.id_token, clientId }
}

async function verifyChreeidIdToken(idToken, { clientId, nonce }) {
  const parts = idToken.split('.')
  if (parts.length !== 3) throw new Error('ChreeID IDトークンの形式が不正です')
  const header = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0])))
  const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[1])))
  if (!header || header.alg !== 'RS256' || typeof header.kid !== 'string') {
    throw new Error('ChreeID IDトークンの署名方式が不正です')
  }

  const response = await fetch(`${issuer}/oauth/jwks`, { credentials: 'omit' })
  if (!response.ok) throw new Error(`ChreeID署名鍵を取得できません（HTTP ${response.status}）`)
  const jwks = await response.json()
  const jwk = jwks.keys?.find((key) =>
    key.kid === header.kid
    && key.kty === 'RSA'
    && key.alg === 'RS256'
    && (key.use === undefined || key.use === 'sig')
    && (key.key_ops === undefined || key.key_ops.includes('verify')),
  )
  if (!jwk) throw new Error('ChreeID署名鍵が見つかりません')

  const verificationKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    verificationKey,
    fromBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  )
  if (!verified) throw new Error('ChreeID IDトークンの署名が正しくありません')

  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  const now = Math.floor(Date.now() / 1000)
  if (
    claims.iss !== issuer
    || !audience.includes(clientId)
    || (audience.length > 1 && claims.azp !== clientId)
    || claims.nonce !== nonce
    || typeof claims.sub !== 'string'
    || claims.sub.length === 0
    || claims.sub.length > 255
    || !Number.isSafeInteger(claims.iat)
    || claims.iat > now + 60
    || now - claims.iat > 600
    || !Number.isSafeInteger(claims.exp)
    || claims.exp <= now
    || claims.exp <= claims.iat
    || claims.exp - claims.iat > 3600
  ) {
    throw new Error('ChreeID IDトークンの発行者、宛先、nonce、期限、subのいずれかが不正です')
  }
  return claims.sub
}

export async function completeChreeidLogin(search) {
  const { pending, idToken, clientId } = await exchangeChreeidCode(search, 'issue')
  await verifyChreeidIdToken(idToken, { clientId, nonce: pending.nonce })
  return { issue: pending.issue, idToken }
}

export async function completeChreeidAccountLogin(search) {
  const { pending, idToken, clientId } = await exchangeChreeidCode(search, 'account')
  const sub = await verifyChreeidIdToken(idToken, { clientId, nonce: pending.nonce })
  const account = { sub }
  localStorage.setItem(accountStorageKey, JSON.stringify(account))
  return account
}

export function getChreeidAccount() {
  const value = localStorage.getItem(accountStorageKey)
  if (!value) return null
  try {
    const account = JSON.parse(value)
    return typeof account.sub === 'string' && account.sub.length > 0 ? account : null
  } catch {
    return null
  }
}

export function logoutChreeidAccount() {
  localStorage.removeItem(accountStorageKey)
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
