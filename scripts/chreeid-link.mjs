// Issue専用nonceとChreeIDの署名済みIDトークンをActions上で検証する。
import { createCipheriv, createDecipheriv, createHmac, createPublicKey, privateDecrypt, verify } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isSubmissionTitle } from './submission-i18n.mjs'

const issuer = 'https://id.wikichree.com'
const tokenLifetimeLimit = 3600

function issueNumberOf(event) {
  const number = event.issue?.number
  if (!Number.isSafeInteger(number) || number < 1 || event.issue?.pull_request) {
    throw new Error('GitHub Issue が不正です')
  }
  return number
}

function requireIssueAuthor(event) {
  if (event.issue?.user?.login !== event.comment?.user?.login) {
    throw new Error('Issue の投稿者本人だけがChreeID連携を確認できます')
  }
}

export function issueChallenge(privateKey, repository, issueNumber) {
  if (!privateKey || !/^[^/]+\/[^/]+$/.test(repository) || !Number.isSafeInteger(issueNumber) || issueNumber < 1) {
    throw new Error('Issue連携の設定または番号が不正です')
  }
  return createHmac('sha256', privateKey)
    .update(`${repository}#${issueNumber}`)
    .digest('base64url')
}

function decodeBase64Url(value, maxLength) {
  if (typeof value !== 'string' || value.length > maxLength || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('暗号化されたChreeID証明の形式が不正です')
  }
  return Buffer.from(value, 'base64url')
}

function decryptToken(encodedEnvelope, privateKey) {
  const envelope = JSON.parse(decodeBase64Url(encodedEnvelope, 12000).toString('utf8'))
  if (
    !envelope
    || Object.keys(envelope).sort().join(',') !== 'data,iv,key'
    || typeof envelope.key !== 'string'
    || typeof envelope.iv !== 'string'
    || typeof envelope.data !== 'string'
  ) {
    throw new Error('暗号化されたChreeID証明の形式が不正です')
  }

  const aesKey = privateDecrypt(
    { key: privateKey, oaepHash: 'sha256' },
    decodeBase64Url(envelope.key, 2048),
  )
  const iv = decodeBase64Url(envelope.iv, 64)
  if (aesKey.length !== 32 || iv.length !== 12) throw new Error('暗号化されたChreeID証明の鍵長が不正です')
  const data = decodeBase64Url(envelope.data, 11000)
  const decipher = createDecipheriv('aes-256-gcm', aesKey, iv)
  if (data.length < 16) throw new Error('暗号化されたChreeID証明が短すぎます')
  decipher.setAuthTag(data.subarray(-16))
  const plaintext = Buffer.concat([decipher.update(data.subarray(0, -16)), decipher.final()])
  return plaintext.toString('utf8')
}

async function verifyIdToken(token, { clientId, nonce, now, fetcher }) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('ChreeID IDトークンの形式が不正です')
  const header = JSON.parse(decodeBase64Url(parts[0], 2048).toString('utf8'))
  const claims = JSON.parse(decodeBase64Url(parts[1], 8192).toString('utf8'))
  if (!header || typeof header !== 'object' || !claims || typeof claims !== 'object') {
    throw new Error('ChreeID IDトークンの内容が不正です')
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('ChreeID署名方式が不正です')

  const response = await fetcher(`${issuer}/oauth/jwks`, { signal: AbortSignal.timeout(10000) })
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
  const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`)
  if (!verify('RSA-SHA256', signingInput, createPublicKey({ key: jwk, format: 'jwk' }), decodeBase64Url(parts[2], 2048))) {
    throw new Error('ChreeID IDトークンの署名が正しくありません')
  }

  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  const issuedAt = claims.iat
  const expiresAt = claims.exp
  if (
    claims.iss !== issuer
    || !audience.includes(clientId)
    || (audience.length > 1 && claims.azp !== clientId)
    || claims.nonce !== nonce
    || typeof claims.sub !== 'string'
    || claims.sub.length === 0
    || claims.sub.length > 255
    || !Number.isSafeInteger(issuedAt)
    || issuedAt > now + 60
    || now - issuedAt > 600
    || !Number.isSafeInteger(expiresAt)
    || expiresAt <= now
    || expiresAt <= issuedAt
    || expiresAt - issuedAt > tokenLifetimeLimit
  ) {
    throw new Error('ChreeID IDトークンの発行者、宛先、nonce、期限、subのいずれかが不正です')
  }
  return claims.sub
}

export async function verifyChreeidProof(event, { privateKey, clientId, repository, now = Math.floor(Date.now() / 1000), fetcher = fetch }) {
  requireIssueAuthor(event)
  const issueNumber = issueNumberOf(event)
  if (!isSubmissionTitle(event.issue.title)) throw new Error('プラグイン投稿Issueではありません')
  const match = /^\/chreeid-proof ([A-Za-z0-9_-]+)$/.exec(event.comment.body ?? '')
  if (!match) throw new Error('ChreeID証明コマンドの形式が不正です')
  if (!privateKey || !clientId) throw new Error('ChreeID連携のActions設定が不足しています')

  const nonce = issueChallenge(privateKey, repository, issueNumber)
  return verifyIdToken(decryptToken(match[1], privateKey), { clientId, nonce, now, fetcher })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [mode, eventPath] = process.argv.slice(2)
  if (!eventPath) throw new Error('GitHub Event JSON のパスが必要です')
  const event = JSON.parse(await readFile(eventPath, 'utf8'))
  const privateKey = process.env.CHREEID_LINK_PRIVATE_KEY
  if (mode === 'challenge') {
    requireIssueAuthor(event)
    process.stdout.write(`${issueChallenge(privateKey, process.env.GITHUB_REPOSITORY, issueNumberOf(event))}\n`)
  } else if (mode === 'verify') {
    const sub = await verifyChreeidProof(event, {
      privateKey,
      clientId: process.env.CHREEID_CLIENT_ID,
      repository: process.env.GITHUB_REPOSITORY,
    })
    process.stdout.write(`${Buffer.from(sub).toString('base64url')}\n`)
  } else {
    throw new Error('使い方: node scripts/chreeid-link.mjs <challenge|verify> <event.json>')
  }
}
