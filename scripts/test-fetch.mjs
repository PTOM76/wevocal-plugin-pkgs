// テストで使う。環境変数 TEST_FETCH_MAP（URL から JSON 本文への表）の URL だけを、通信せずに返す fetch に差し替える。
const map = JSON.parse(process.env.TEST_FETCH_MAP ?? '{}')
const realFetch = globalThis.fetch

globalThis.fetch = async (url, options) => {
  const key = String(url)
  if (key in map) {
    const body = map[key] === null ? null : JSON.stringify(map[key])
    return new Response(body, { status: body === null ? 404 : 200, headers: { 'content-type': 'application/json' } })
  }
  if (process.env.TEST_FETCH_STRICT) return new Response(null, { status: 404 })
  return realFetch(url, options)
}
