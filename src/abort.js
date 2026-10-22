// fetch の中断（AbortController.abort）による拒否かどうか。
export function isAbort(reason) {
  return reason instanceof DOMException && reason.name === 'AbortError'
}
