// カタログの 1 件ぶんのカード（配布元、作者サイト、個別 JSON へのリンク付き）。
import { Button, Card, CardActions, CardContent, CardMedia, Chip, Stack, Typography } from '@mui/material'
import { t, useLang } from './i18n.js'

function safeUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

export default function PluginCard({ entry }) {
  useLang()
  const thumbnail = safeUrl(entry.thumbnail)
  const pluginUrl = safeUrl(entry.url)
  const website = safeUrl(entry.website)
  const metadataUrl = `${import.meta.env.BASE_URL}data/plugins/${encodeURIComponent(entry.id)}.json`

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)' }}>
      {thumbnail && (
        <CardMedia
          component="img"
          image={thumbnail}
          alt=""
          loading="lazy"
          sx={{ height: 176, objectFit: 'cover', bgcolor: 'action.hover' }}
        />
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
          <Typography component="h2" variant="h6" sx={{ flexGrow: 1, lineHeight: 1.3 }}>
            {entry.name}
          </Typography>
          <Chip size="small" label={entry.type.toUpperCase()} variant="outlined" />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {entry.author}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-line' }}>
          {entry.description || t('plugin.no_description')}
        </Typography>
        {!!entry.categories.length && (
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 2, flexWrap: 'wrap' }}>
            {entry.categories.map((category) => (
              <Chip key={category} size="small" label={category} />
            ))}
          </Stack>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 0, flexWrap: 'wrap' }}>
        {pluginUrl && (
          <Button component="a" href={pluginUrl} target="_blank" rel="noopener noreferrer" size="small">
            {t('plugin.source')}
          </Button>
        )}
        {website && (
          <Button component="a" href={website} target="_blank" rel="noopener noreferrer" size="small">
            {t('plugin.website')}
          </Button>
        )}
        <Button component="a" href={metadataUrl} size="small">
          {t('plugin.json')}
        </Button>
      </CardActions>
    </Card>
  )
}
