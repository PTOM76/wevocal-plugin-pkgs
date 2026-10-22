// 言語別の Issue Form テンプレートを submission-i18n.mjs から生成する（--check で差分の確認）。
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { REMOVAL_REASON_LABEL, REMOVAL_TEXT, REMOVAL_TITLE_PREFIX, removalTemplateFile } from './removal-i18n.mjs'
import { FIELD_LABELS, LANGS, TEMPLATE_TEXT, TITLE_PREFIX, templateFile } from './submission-i18n.mjs'

const directory = fileURLToPath(new URL('../.github/ISSUE_TEMPLATE/', import.meta.url))
const q = (value) => JSON.stringify(value)

export function renderTemplate(lang) {
  const text = TEMPLATE_TEXT[lang]
  const label = (key) => FIELD_LABELS[key][lang]
  const input = (id, extra, validations) => [
    '  - type: input',
    `    id: ${id}`,
    '    attributes:',
    `      label: ${q(label(id))}`,
    ...extra,
    '    validations:',
    ...validations,
  ]
  const rule = (required, max, min) => [
    `      required: ${required}`,
    ...(min ? [`      min-length: ${min}`] : []),
    `      max-length: ${max}`,
  ]

  return `${[
    '# GitHubログイン済みユーザーからプラグイン登録情報を受け付けるフォーム（scripts/issue-templates.mjs で生成）。',
    `name: ${q(text.name)}`,
    `description: ${q(text.description)}`,
    `title: ${q(TITLE_PREFIX[lang])}`,
    'body:',
    '  - type: markdown',
    '    attributes:',
    '      value: |',
    `        ${text.intro}`,
    '  - type: dropdown',
    '    id: type',
    '    attributes:',
    `      label: ${q(label('type'))}`,
    '      options:',
    '        - wam',
    '        - manifest',
    '        - vst',
    '    validations:',
    '      required: false',
    ...input('id', [`      description: ${q(text.idHint)}`, '      placeholder: com.example.plugin'], rule(false, 96)),
    ...input('name', [`      description: ${q(text.autoHint)}`, '      placeholder: Example Reverb'], rule(false, 120)),
    ...input('author', [`      description: ${q(text.autoHint)}`], rule(false, 120)),
    ...input('url', [`      description: ${q(text.urlHint)}`, '      placeholder: https://example.com/plugin.js'], rule(true, 2048)),
    ...input('description', [], rule(false, 500)),
    ...input('website', [`      description: ${q(text.websiteHint)}`], rule(false, 2048)),
    ...input('categories', ['      placeholder: Effect, Reverb'], rule(false, 400)),
  ].join('\n')}\n`
}

// 取り下げの申請フォーム
export function renderRemovalTemplate(lang) {
  const text = REMOVAL_TEXT[lang]
  return `${[
    '# 登録したプラグインの取り下げを受け付けるフォーム（scripts/issue-templates.mjs で生成）。',
    `name: ${q(text.name)}`,
    `description: ${q(text.description)}`,
    `title: ${q(REMOVAL_TITLE_PREFIX[lang])}`,
    'body:',
    '  - type: markdown',
    '    attributes:',
    '      value: |',
    `        ${text.intro}`,
    '  - type: input',
    '    id: id',
    '    attributes:',
    `      label: ${q(FIELD_LABELS.id[lang])}`,
    `      description: ${q(text.idHint)}`,
    '      placeholder: com.example.plugin',
    '    validations:',
    '      required: true',
    '      min-length: 2',
    '      max-length: 96',
    '  - type: input',
    '    id: reason',
    '    attributes:',
    `      label: ${q(REMOVAL_REASON_LABEL[lang])}`,
    '    validations:',
    '      required: false',
    '      max-length: 500',
  ].join('\n')}\n`
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const check = process.argv.includes('--check')
  let stale = 0
  for (const [file, render] of [[templateFile, renderTemplate], [removalTemplateFile, renderRemovalTemplate]]) {
    for (const lang of LANGS) {
      const path = `${directory}${file(lang)}`
      const expected = render(lang)
      if (check) {
        const actual = await readFile(path, 'utf8').catch(() => '')
        if (actual.replaceAll('\r\n', '\n') !== expected) {
          console.error(`古いテンプレートです: ${file(lang)}（node scripts/issue-templates.mjs で再生成）`)
          stale += 1
        }
      } else {
        await writeFile(path, expected)
      }
    }
  }
  if (stale) process.exit(1)
}
