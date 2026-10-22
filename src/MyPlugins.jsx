// マイページの「自分のプラグイン」。連携済みの申請の投稿者が登録したプラグインを一覧し、更新の申請を開く。
import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, Stack, Typography } from '@mui/material'
import { removalUrl, submissionUrl } from './AppShell.jsx'
import { isAbort } from './abort.js'
import { t, useLang } from './i18n.js'

const catalogUrl = `${import.meta.env.BASE_URL}data/index.json`

// 更新の申請フォームに、今の登録内容を入れた状態で開く
const updateUrl = (lang, entry) => submissionUrl(lang, {
  type: entry.type,
  id: entry.id,
  name: entry.name,
  author: entry.author,
  url: entry.url,
  description: entry.description,
  website: entry.website,
  categories: entry.categories.join(', '),
})

export default function MyPlugins({ logins }) {
  const lang = useLang()
  const [entries, setEntries] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(catalogUrl, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((catalog) => setEntries(Array.isArray(catalog.plugins) ? catalog.plugins : []))
      .catch((reason) => {
        if (!isAbort(reason)) setEntries([])
      })
    return () => controller.abort()
  }, [])

  const mine = (entries ?? []).filter((entry) => entry.submitter && logins.has(entry.submitter.toLowerCase()))
  if (entries === null || (mine.length === 0 && logins.size === 0)) return null

  return (
    <Box component="section" aria-labelledby="my-plugins-heading" sx={{ mb: 4 }}>
      <Typography id="my-plugins-heading" component="h2" variant="h5" sx={{ mb: 0.5 }}>
        {t('plugins.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t('plugins.note')}
      </Typography>
      {mine.length === 0 && <Alert severity="info">{t('plugins.empty')}</Alert>}
      <Stack spacing={1}>
        {mine.map((entry) => (
          <Card key={entry.id} variant="outlined">
            <CardContent sx={{ pb: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                <Typography component="h3" variant="subtitle1" sx={{ flexGrow: 1 }}>{entry.name}</Typography>
                <Chip size="small" variant="outlined" label={entry.type.toUpperCase()} />
              </Stack>
              <Typography variant="body2" color="text.secondary">{entry.id}</Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pt: 0 }}>
              <Button component="a" href={updateUrl(lang, entry)} target="_blank" rel="noopener noreferrer" size="small">
                {t('plugins.update')}
              </Button>
              <Button component="a" href={removalUrl(lang, entry.id)} target="_blank" rel="noopener noreferrer" size="small" color="error">
                {t('plugins.withdraw')}
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>
    </Box>
  )
}
