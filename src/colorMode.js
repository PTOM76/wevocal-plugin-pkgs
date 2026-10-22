// 表示の明暗（ライト、ダーク）の判定と切り替え。保存がなければ OS の設定に従う。
import { useSyncExternalStore } from 'react'

const storageKey = 'wevocal-plugin-pkgs.color-mode'
const listeners = new Set()

function detect() {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // 保存できない環境では OS の設定だけで判定する
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

let current = detect()

export function toggleColorMode() {
  current = current === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(storageKey, current)
  } catch {
    // 保存できなくても表示は切り替える
  }
  listeners.forEach((listener) => listener())
}

export function useColorMode() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}
