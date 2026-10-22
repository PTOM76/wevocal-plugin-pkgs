// ChreeIDに連携された公開Issue一覧の検索を検証する。
import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchChreeidSubmissions } from '../src/chreeidSubmissions.js'

const sub = 'user-sub-123'

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

test('lists only registration Issues with a verified ChreeID link by the Actions bot', async () => {
  const urls = []
  const fetcher = async (url) => {
    urls.push(String(url))
    if (String(url).startsWith('https://api.github.com/search/issues')) {
      return response({
        total_count: 2,
        incomplete_results: false,
        items: [
          {
            number: 12,
            user: { login: 'PTOM76' },
            title: '[プラグイン登録] Example',
            state: 'open',
            created_at: '2026-10-19T00:00:00Z',
            html_url: 'https://github.com/PTOM76/wevocal-plugin-pkgs/issues/12',
            comments: 1,
            comments_url: 'https://api.github.com/repos/PTOM76/wevocal-plugin-pkgs/issues/12/comments',
          },
          {
            number: 11,
            title: '[別のIssue] Example',
            state: 'open',
            created_at: '2026-10-19T00:00:00Z',
            html_url: 'https://github.com/PTOM76/wevocal-plugin-pkgs/issues/11',
            comments: 1,
            comments_url: 'https://api.github.com/repos/PTOM76/wevocal-plugin-pkgs/issues/11/comments',
          },
        ],
      })
    }
    if (String(url).includes('/issues/12/comments')) {
      return response([{
        user: { login: 'github-actions[bot]' },
        body: `<!-- chreeid-linked:v1 -->\n- ChreeID sub: \`${sub}\``,
      }])
    }
    throw new Error(`Unexpected URL: ${url}`)
  }

  assert.deepEqual(await fetchChreeidSubmissions(sub, { fetcher }), [{
    number: 12,
    login: 'PTOM76',
    title: '[プラグイン登録] Example',
    state: 'open',
    createdAt: '2026-10-19T00:00:00Z',
    url: 'https://github.com/PTOM76/wevocal-plugin-pkgs/issues/12',
  }])
  assert.match(urls[0], /in%3Acomments/)
})

test('does not treat user-written link markers as verified links', async () => {
  const fetcher = async (url) => String(url).startsWith('https://api.github.com/search/issues')
    ? response({
      total_count: 1,
      incomplete_results: false,
      items: [{
        number: 12,
        title: '[プラグイン登録] Example',
        state: 'open',
        created_at: '2026-10-19T00:00:00Z',
        html_url: 'https://github.com/PTOM76/wevocal-plugin-pkgs/issues/12',
        comments: 1,
        comments_url: 'https://api.github.com/repos/PTOM76/wevocal-plugin-pkgs/issues/12/comments',
      }],
    })
    : response([{
      user: { login: 'PTOM76' },
      body: `<!-- chreeid-linked:v1 -->\n- ChreeID sub: \`${sub}\``,
    }])

  assert.deepEqual(await fetchChreeidSubmissions(sub, { fetcher }), [])
})
