// サイトの表示言語（辞書、判定、切り替え）。React 外のコードからも t() で訳文を取れる。
import { useSyncExternalStore } from 'react'
import { DEFAULT_LANG, LANGS } from '../scripts/submission-i18n.mjs'
import { LocalizedError } from './localizedError.js'
import ja from './i18n/ja.json'
import en from './i18n/en.json'
import ko from './i18n/ko.json'
import zh_cn from './i18n/zh_cn.json'
import zh_tw from './i18n/zh_tw.json'

const dictionaries = { ja, en, ko, zh_cn, zh_tw }
const storageKey = 'wevocal-plugin-pkgs.lang'
const htmlLang = { ja: 'ja', en: 'en', ko: 'ko', zh_cn: 'zh-CN', zh_tw: 'zh-TW' }
const listeners = new Set()

function fromTag(tag) {
  const lower = String(tag).toLowerCase().replace('_', '-')
  if (lower.startsWith('ja')) return 'ja'
  if (lower.startsWith('ko')) return 'ko'
  if (lower.startsWith('zh')) return /-(tw|hk|mo|hant)/.test(lower) ? 'zh_tw' : 'zh_cn'
  if (lower.startsWith('en')) return 'en'
  return null
}

function detect() {
  try {
    const query = new URLSearchParams(window.location.search).get('lang')
    if (LANGS.includes(query)) return query
    const saved = localStorage.getItem(storageKey)
    if (LANGS.includes(saved)) return saved
  } catch {
    // 保存できない環境では端末の言語だけで判定する
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const lang = fromTag(tag)
    if (lang) return lang
  }
  return 'en'
}

let current = DEFAULT_LANG

export function t(key, params) {
  const text = dictionaries[current][key] ?? dictionaries.en[key] ?? key
  return params ? text.replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match)) : text
}

// 例外を画面に出す文字列にする（LocalizedError は辞書で訳す）
export function errorText(reason) {
  if (reason instanceof LocalizedError) return t(reason.key, reason.params)
  return reason instanceof Error ? reason.message : String(reason)
}

function apply() {
  document.documentElement.lang = htmlLang[current]
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'))
}

export function initLang() {
  current = detect()
  apply()
}

export function getLang() {
  return current
}

export function setLang(lang) {
  if (!LANGS.includes(lang) || lang === current) return
  current = lang
  try {
    localStorage.setItem(storageKey, lang)
  } catch {
    // 保存できなくても表示は切り替える
  }
  apply()
  listeners.forEach((listener) => listener())
}

// 言語が変わったときに再描画させる
export function useLang() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getLang,
  )
}
