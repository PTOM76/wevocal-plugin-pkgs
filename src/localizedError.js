// 画面で訳して表示するエラー。message は辞書のキー、表示は i18n.js の errorText で行う。
export class LocalizedError extends Error {
  constructor(key, params) {
    super(key)
    this.key = key
    this.params = params
  }
}
