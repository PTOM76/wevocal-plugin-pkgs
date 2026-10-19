const catalogUrl = new URL('./data/index.json', import.meta.url)
const cards = document.querySelector('#plugins')
const search = document.querySelector('#search')
const status = document.querySelector('#status')
let entries = []

function safeUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

function render() {
  const query = search.value.trim().toLocaleLowerCase()
  const visible = entries.filter((entry) =>
    [entry.name, entry.author, entry.description, ...entry.categories, ...entry.keywords]
      .join(' ')
      .toLocaleLowerCase()
      .includes(query),
  )
  cards.replaceChildren()
  for (const entry of visible) {
    const card = document.createElement('article')
    card.className = 'card'
    const imageUrl = safeUrl(entry.thumbnail)
    if (imageUrl) {
      const image = document.createElement('img')
      image.src = imageUrl
      image.alt = ''
      image.loading = 'lazy'
      card.append(image)
    }

    const body = document.createElement('div')
    body.className = 'card-body'
    const title = document.createElement('h2')
    title.textContent = entry.name
    const author = document.createElement('p')
    author.className = 'meta'
    author.textContent = `${entry.author} · ${entry.type.toUpperCase()}`
    const description = document.createElement('p')
    description.textContent = entry.description || '説明はありません。'
    const tags = document.createElement('div')
    tags.className = 'tags'
    for (const label of entry.categories) {
      const tag = document.createElement('span')
      tag.className = 'tag'
      tag.textContent = label
      tags.append(tag)
    }
    const links = document.createElement('div')
    links.className = 'links'
    const install = safeUrl(entry.url)
    if (install) {
      const plugin = document.createElement('a')
      plugin.href = install
      plugin.textContent = '配布元'
      plugin.target = '_blank'
      plugin.rel = 'noopener noreferrer'
      links.append(plugin)
    }
    const website = safeUrl(entry.website)
    if (website) {
      const authorLink = document.createElement('a')
      authorLink.href = website
      authorLink.textContent = '作者サイト'
      authorLink.target = '_blank'
      authorLink.rel = 'noopener noreferrer'
      links.append(authorLink)
    }
    const metadata = document.createElement('a')
    metadata.href = new URL(`./data/plugins/${encodeURIComponent(entry.id)}.json`, import.meta.url).href
    metadata.textContent = 'JSON'
    links.append(metadata)
    body.append(title, author, description, tags, links)
    card.append(body)
    cards.append(card)
  }
  status.textContent = `${entries.length} 件中 ${visible.length} 件を表示`
}

search.addEventListener('input', render)

try {
  const response = await fetch(catalogUrl)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const catalog = await response.json()
  if (catalog.version !== 1 || !Array.isArray(catalog.plugins)) throw new Error('カタログの形式に対応していません')
  entries = catalog.plugins
  render()
} catch (error) {
  status.textContent = `カタログを読み込めませんでした: ${error instanceof Error ? error.message : String(error)}`
}
