// ChreeID連携の暗号化、Issue投稿者、OIDC署名とクレーム検証を確認する。
import assert from 'node:assert/strict'
import {
  createCipheriv,
  generateKeyPairSync,
  publicEncrypt,
  sign,
} from 'node:crypto'
import test from 'node:test'
import { issueChallenge, verifyChreeidProof } from './chreeid-link.mjs'

const issuer = 'https://id.wikichree.com'
const clientId = 'catalog-client'
const repository = 'PTOM76/wevocal-plugin-pkgs'
const issueNumber = 42
const now = 1_800_000_000
const { privateKey: privateKeyObject, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const privateKey = privateKeyObject.export({ type: 'pkcs8', format: 'pem' })
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' }

function tokenFor(overrides = {}) {
  const challenge = issueChallenge(privateKey, repository, issueNumber)
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const header = encode({ alg: 'RS256', kid: jwk.kid })
  const claims = encode({
    iss: issuer,
    aud: clientId,
    sub: 'chreeid-user-123',
    iat: now - 30,
    exp: now + 600,
    nonce: challenge,
    ...overrides,
  })
  const input = `${header}.${claims}`
  return `${input}.${sign('RSA-SHA256', Buffer.from(input), privateKeyObject).toString('base64url')}`
}

function encryptedProof(token) {
  const key = Buffer.from('0123456789abcdef0123456789abcdef')
  const iv = Buffer.from('123456789012')
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(token), cipher.final(), cipher.getAuthTag()])
  const encryptedKey = publicEncrypt(
    { key: publicKey, oaepHash: 'sha256' },
    key,
  )
  return Buffer.from(JSON.stringify({
    key: encryptedKey.toString('base64url'),
    iv: iv.toString('base64url'),
    data: data.toString('base64url'),
  })).toString('base64url')
}

function eventFor(token, overrides = {}) {
  return {
    issue: {
      number: issueNumber,
      body: '<!-- plugin-submission-v1 -->',
      user: { login: 'github-author' },
    },
    comment: {
      body: `/chreeid-proof ${encryptedProof(token)}`,
      user: { login: 'github-author' },
    },
    ...overrides,
  }
}

const fetchJwks = async () => ({
  ok: true,
  json: async () => ({ keys: [jwk] }),
})

const options = { privateKey, clientId, repository, now, fetcher: fetchJwks }

test('verifies an encrypted ChreeID token bound to the author and Issue', async () => {
  assert.equal(await verifyChreeidProof(eventFor(tokenFor()), options), 'chreeid-user-123')
})

test('rejects proof comments from another GitHub user', async () => {
  const event = eventFor(tokenFor())
  event.comment.user.login = 'someone-else'
  await assert.rejects(verifyChreeidProof(event, options), /投稿者本人/)
})

test('rejects tokens with an Issue-specific nonce mismatch', async () => {
  await assert.rejects(verifyChreeidProof(eventFor(tokenFor({ nonce: 'wrong' })), options), /nonce/)
})

test('rejects tokens for a different client', async () => {
  await assert.rejects(verifyChreeidProof(eventFor(tokenFor({ aud: 'another-client' })), options), /宛先/)
})

test('rejects expired tokens', async () => {
  await assert.rejects(verifyChreeidProof(eventFor(tokenFor({ exp: now - 1 })), options), /期限/)
})

test('rejects proof comments attached to another Issue', async () => {
  const event = eventFor(tokenFor())
  event.issue.number += 1
  await assert.rejects(verifyChreeidProof(event, options), /nonce/)
})
