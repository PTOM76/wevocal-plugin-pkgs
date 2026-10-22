// 取り下げ（掲載の削除）の申請の多言語定義。Issue のタイトルの接頭辞、項目名、フォームと返信の文言。
import { DEFAULT_LANG, FIELD_LABELS, LANGS } from './submission-i18n.mjs'

export const REMOVAL_TITLE_PREFIX = {
  ja: '[プラグイン取り下げ]',
  en: '[Plugin removal]',
  ko: '[플러그인 삭제]',
  zh_cn: '[插件撤下]',
  zh_tw: '[外掛下架]',
}

export function removalTemplateFile(lang) {
  return lang === 'ja' ? 'plugin-removal.yml' : `plugin-removal.${lang}.yml`
}

export function removalLangOfTitle(title) {
  if (typeof title !== 'string') return null
  return LANGS.find((lang) => title.startsWith(REMOVAL_TITLE_PREFIX[lang])) ?? null
}

export const isRemovalTitle = (title) => removalLangOfTitle(title) !== null

export const REMOVAL_REASON_LABEL = {
  ja: '理由（任意）',
  en: 'Reason (optional)',
  ko: '이유 (선택)',
  zh_cn: '原因（可选）',
  zh_tw: '原因（選填）',
}

// 項目名（どの言語でも）から項目のキーを引く
export const REMOVAL_FIELD_BY_LABEL = new Map([
  ...LANGS.map((lang) => [FIELD_LABELS.id[lang], 'id']),
  ...LANGS.map((lang) => [REMOVAL_REASON_LABEL[lang], 'reason']),
])

export const REMOVAL_TEXT = {
  ja: {
    name: 'プラグイン取り下げ',
    description: '登録したプラグインの掲載の取り下げを申請',
    intro: '掲載を取り下げるには、そのプラグインを最初に登録した GitHub アカウントで投稿してください。別のアカウントの申請は処理されません。',
    idHint: '取り下げるプラグインの ID（カタログに載っているもの）。',
  },
  en: {
    name: 'Plugin removal',
    description: 'Request to withdraw a plugin you registered',
    intro: 'Submit this with the GitHub account that first registered the plugin. Requests from other accounts are not processed.',
    idHint: 'The ID of the plugin to withdraw, as listed in the catalog.',
  },
  ko: {
    name: '플러그인 삭제',
    description: '등록한 플러그인의 게재 삭제를 신청',
    intro: '플러그인을 처음 등록한 GitHub 계정으로 제출하세요. 다른 계정의 신청은 처리되지 않습니다.',
    idHint: '삭제할 플러그인의 ID (카탈로그에 올라 있는 것).',
  },
  zh_cn: {
    name: '插件撤下',
    description: '申请撤下已登记的插件',
    intro: '请使用最初登记该插件的 GitHub 账号提交。其他账号的申请不会被处理。',
    idHint: '要撤下的插件 ID（目录中列出的 ID）。',
  },
  zh_tw: {
    name: '外掛下架',
    description: '申請下架已登錄的外掛',
    intro: '請使用最初登錄該外掛的 GitHub 帳號提交。其他帳號的申請不會被處理。',
    idHint: '要下架的外掛 ID（目錄中列出的 ID）。',
  },
}

const REMOVAL_REPLY = {
  ja: { failed: '取り下げを自動処理できませんでした。ID を確認してください。取り下げできるのは、最初に登録した投稿者だけです。' },
  en: { failed: 'The removal could not be processed automatically. Check the ID. Only the original submitter can withdraw a plugin.' },
  ko: { failed: '삭제를 자동으로 처리하지 못했습니다. ID를 확인하세요. 처음 등록한 제출자만 삭제할 수 있습니다.' },
  zh_cn: { failed: '无法自动处理撤下申请。请检查 ID。只有最初的提交者才能撤下插件。' },
  zh_tw: { failed: '無法自動處理下架申請。請檢查 ID。只有最初的提交者才能下架外掛。' },
}

export const removalReply = (lang, key) => REMOVAL_REPLY[lang ?? DEFAULT_LANG][key]
