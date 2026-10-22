// 取り下げの Issue Form の本文を検証し、プラグインの ID と理由に変換する。
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { REMOVAL_FIELD_BY_LABEL } from './removal-i18n.mjs'

export function parseIssueRemoval(body) {
  if (typeof body !== 'string' || body.length > 20_000) throw new Error('プラグイン取り下げフォームの Issue ではありません')

  const fields = new Map()
  for (const section of body.split(/^### /m).slice(1)) {
    const newline = section.indexOf('\n')
    if (newline < 0) throw new Error('Issue Form の項目が不正です')
    const label = section.slice(0, newline).trim()
    const key = REMOVAL_FIELD_BY_LABEL.get(label)
    if (!key || fields.has(key)) throw new Error(`Issue Form に不明または重複した項目があります: ${label}`)
    const value = section.slice(newline + 1).trim()
    if (value.includes('\n')) throw new Error(`複数行の入力はできません: ${label}`)
    fields.set(key, value === '_No response_' ? '' : value)
  }

  if (fields.size !== 2) throw new Error('Issue Form の項目が不足しています')
  const id = fields.get('id')
  if (!/^[a-z0-9][a-z0-9._-]{1,95}$/.test(id)) throw new Error('ID は小文字の英数字で始まる2〜96文字にしてください')
  const reason = fields.get('reason')
  if (reason.length > 500) throw new Error('理由は500文字以内にしてください')
  return { id, reason }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [eventPath] = process.argv.slice(2)
  if (!eventPath) throw new Error('GitHub Event JSON のパスが必要です')
  const event = JSON.parse(await readFile(eventPath, 'utf8'))
  process.stdout.write(`${JSON.stringify(parseIssueRemoval(event.issue?.body))}\n`)
}
