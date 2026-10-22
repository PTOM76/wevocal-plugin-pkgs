// 取り下げの Issue Form の入力と、言語別テンプレートが最新であることを確かめる。
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { renderRemovalTemplate } from './issue-templates.mjs'
import { parseIssueRemoval } from './issue-removal.mjs'
import { REMOVAL_REASON_LABEL, REMOVAL_TITLE_PREFIX, isRemovalTitle, removalLangOfTitle, removalTemplateFile } from './removal-i18n.mjs'
import { FIELD_LABELS, LANGS, isSubmissionTitle } from './submission-i18n.mjs'

for (const lang of LANGS) {
  test(`parses a removal request written in ${lang}`, () => {
    const body = `### ${FIELD_LABELS.id[lang]}\nnet.example.reverb\n\n### ${REMOVAL_REASON_LABEL[lang]}\n_No response_\n`
    assert.deepEqual(parseIssueRemoval(body), { id: 'net.example.reverb', reason: '' })
  })

  test(`keeps the ${lang} removal template in sync`, async () => {
    const path = fileURLToPath(new URL(`../.github/ISSUE_TEMPLATE/${removalTemplateFile(lang)}`, import.meta.url))
    const actual = (await readFile(path, 'utf8')).replaceAll('\r\n', '\n')
    assert.equal(actual, renderRemovalTemplate(lang))
    assert.equal(removalLangOfTitle(`${REMOVAL_TITLE_PREFIX[lang]} example`), lang)
  })
}

test('removal titles are not mistaken for submission titles', () => {
  for (const lang of LANGS) {
    assert.equal(isSubmissionTitle(`${REMOVAL_TITLE_PREFIX[lang]} x`), false)
    assert.equal(isRemovalTitle(`${REMOVAL_TITLE_PREFIX[lang]} x`), true)
  }
})

test('rejects unknown, missing and unsafe fields', () => {
  assert.throws(() => parseIssueRemoval('### ID\nnet.example.reverb\n'), /不足/)
  assert.throws(() => parseIssueRemoval('### ID\n../x\n\n### Reason (optional)\nhi\n'), /ID は小文字/)
  assert.throws(() => parseIssueRemoval('### ID\nnet.example.reverb\n\n### Other\nhi\n'), /不明または重複/)
  assert.throws(() => parseIssueRemoval('### ID\nnet.example.reverb\n\n### Reason (optional)\nline1\nline2\n'), /複数行/)
})
