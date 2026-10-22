// GitHub Issue Form の本文を検証し、カタログ登録用 JSON に変換する。
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { FIELDS, FIELD_BY_LABEL } from './submission-i18n.mjs'

export function parseIssueSubmission(body) {
  if (typeof body !== 'string' || body.length > 20_000) {
    throw new Error('プラグイン登録フォームの Issue ではありません')
  }

  const sections = body.split(/^### /m).slice(1)
  const fields = new Map()
  for (const section of sections) {
    const newline = section.indexOf('\n')
    if (newline < 0) throw new Error('Issue Form の項目が不正です')
    const label = section.slice(0, newline).trim()
    const key = FIELD_BY_LABEL.get(label)
    if (!key || fields.has(key)) {
      throw new Error(`Issue Form に不明または重複した項目があります: ${label}`)
    }
    const value = section.slice(newline + 1).trim()
    if (value.includes('\n')) throw new Error(`複数行の入力はできません: ${label}`)
    fields.set(key, value === '_No response_' ? '' : value)
  }

  if (fields.size !== FIELDS.length) throw new Error('Issue Form の項目が不足しています')
  const type = fields.get('type')
  if (!['wam', 'manifest', 'vst'].includes(type)) throw new Error('プラグイン種別が不正です')

  const id = fields.get('id')
  if (!/^[a-z0-9][a-z0-9._-]{1,95}$/.test(id)) {
    throw new Error('ID は小文字の英数字で始まる2〜96文字にしてください')
  }
  const name = fields.get('name')
  const author = fields.get('author')
  const url = fields.get('url')
  const description = fields.get('description')
  const website = fields.get('website')
  const categoryText = fields.get('categories')

  if (!name || name.length > 120) throw new Error('プラグイン名は1〜120文字にしてください')
  if (!author || author.length > 120) throw new Error('作者は1〜120文字にしてください')
  if (!url || url.length > 2048) throw new Error('配布 URL は1〜2048文字にしてください')
  if (description.length > 500) throw new Error('説明は500文字以内にしてください')
  if (website.length > 2048) throw new Error('作者サイト URL は2048文字以内にしてください')

  let distributionUrl
  try {
    distributionUrl = new URL(url)
  } catch {
    throw new Error('配布 URL には HTTPS の絶対 URL を入力してください')
  }
  const expectedExtension = { wam: '.js', manifest: '.json', vst: '.dll' }[type]
  if (
    distributionUrl.protocol !== 'https:'
    || distributionUrl.username
    || distributionUrl.password
    || !distributionUrl.pathname.toLowerCase().endsWith(expectedExtension)
  ) {
    throw new Error(`配布 URL は認証情報のない HTTPS ${expectedExtension} URL にしてください`)
  }

  if (website) {
    let websiteUrl
    try {
      websiteUrl = new URL(website)
    } catch {
      throw new Error('作者サイトには HTTPS の絶対 URL を入力してください')
    }
    if (websiteUrl.protocol !== 'https:' || websiteUrl.username || websiteUrl.password) {
      throw new Error('作者サイトには HTTPS の絶対 URL を入力してください')
    }
  }

  const categories = categoryText.split(',').map((category) => category.trim()).filter(Boolean)
  if (categories.length > 10 || categories.some((category) => category.length > 40)) {
    throw new Error('カテゴリは40文字以内を最大10件まで指定できます')
  }

  return { type, id, name, author, url, description, website, categories }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [eventPath] = process.argv.slice(2)
  if (!eventPath) throw new Error('GitHub Event JSON のパスが必要です')
  const event = JSON.parse(await readFile(eventPath, 'utf8'))
  process.stdout.write(`${JSON.stringify(parseIssueSubmission(event.issue?.body))}\n`)
}
