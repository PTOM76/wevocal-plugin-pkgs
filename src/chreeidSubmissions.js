// 公開GitHub Issueからログイン中のChreeIDに紐づく申請を検索する。
const repository = 'PTOM76/wevocal-plugin-pkgs'
const apiBase = `https://api.github.com/repos/${repository}`
const searchUrl = 'https://api.github.com/search/issues'
const linkedMarker = '<!-- chreeid-linked:v1 -->'

function escapeCommentText(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('`', '&#96;')
}

async function getJson(url, fetcher, signal) {
  const response = await fetcher(url, {
    signal,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) throw new Error(`GitHub APIから申請を取得できません（HTTP ${response.status}）`)
  return response.json()
}

async function linkedCommentExists(issue, sub, fetcher, signal) {
  const commentsUrl = new URL(issue.comments_url)
  if (commentsUrl.origin !== 'https://api.github.com' || !commentsUrl.pathname.startsWith(`${apiBase}/issues/`)) {
    throw new Error('GitHub APIから不正なコメントURLが返されました')
  }

  const expectedSub = `- ChreeID sub: \`${escapeCommentText(sub)}\``
  const pages = Math.max(1, Math.ceil(issue.comments / 100))
  for (let page = 1; page <= pages; page += 1) {
    const url = new URL(commentsUrl)
    url.searchParams.set('per_page', '100')
    url.searchParams.set('page', String(page))
    const comments = await getJson(url, fetcher, signal)
    if (comments.some((comment) =>
      comment.user?.login === 'github-actions[bot]'
      && comment.body?.includes(linkedMarker)
      && comment.body.includes(expectedSub),
    )) return true
  }
  return false
}

export async function fetchChreeidSubmissions(sub, { fetcher = fetch, signal } = {}) {
  if (typeof sub !== 'string' || sub.length === 0 || sub.length > 255) {
    throw new Error('ChreeIDアカウント情報が正しくありません')
  }

  const query = `repo:${repository} is:issue in:comments "${sub}"`
  const issues = []
  let page = 1
  let totalCount = 0
  let fetchedCount = 0
  do {
    const url = new URL(searchUrl)
    url.searchParams.set('q', query)
    url.searchParams.set('per_page', '100')
    url.searchParams.set('page', String(page))
    const result = await getJson(url, fetcher, signal)
    totalCount = result.total_count
    if (result.incomplete_results) throw new Error('GitHubの申請検索結果が不完全です。時間をおいて再試行してください。')
    fetchedCount += result.items.length
    issues.push(...result.items.filter((issue) => issue.title?.startsWith('[プラグイン登録]')))
    page += 1
  } while (fetchedCount < totalCount && page <= 10)
  if (fetchedCount < totalCount) throw new Error('申請が多いため一覧を最後まで検索できませんでした。')

  const linkedIssues = await Promise.all(issues.map(async (issue) => (
    await linkedCommentExists(issue, sub, fetcher, signal) ? issue : null
  )))
  return linkedIssues
    .filter(Boolean)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      createdAt: issue.created_at,
      url: issue.html_url,
    }))
    .sort((a, b) => b.number - a.number)
}
