import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  CssBaseline,
  InputAdornment,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
} from '@mui/material'
import AppShell from './AppShell.jsx'
import ChreeidLinkPanel from './ChreeidLinkPanel.jsx'
import {
  beginChreeidAccountLogin,
  completeChreeidAccountLogin,
  getChreeidAccount,
  isChreeidAccountCallback,
  logoutChreeidAccount,
} from './chreeid.js'
import { errorText, initLang, t, useLang } from './i18n.js'
import { theme } from './theme.js'

const catalogUrl = `${import.meta.env.BASE_URL}data/index.json`

function safeUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

function PluginCard({ entry }) {
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


function App() {
  useLang()
  const [entries, setEntries] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [account, setAccount] = useState(getChreeidAccount)
  const [accountError, setAccountError] = useState('')

  useEffect(() => {
    const callbackSearch = window.location.search
    if (!isChreeidAccountCallback(callbackSearch)) return
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`)

    let cancelled = false
    completeChreeidAccountLogin(callbackSearch)
      .then((result) => {
        if (!cancelled) {
          setAccount(result)
          setAccountError('')
        }
      })
      .catch((reason) => {
        if (!cancelled) setAccountError(errorText(reason))
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch(catalogUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((catalog) => {
        if (catalog.version !== 1 || !Array.isArray(catalog.plugins)) {
          throw new Error(t('catalog.unsupported'))
        }
        setEntries(catalog.plugins)
        setStatus('ready')
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(errorText(reason))
        setStatus('error')
      })
    return () => controller.abort()
  }, [])

  const login = () => {
    setAccountError('')
    beginChreeidAccountLogin().catch((reason) => {
      setAccountError(errorText(reason))
    })
  }

  const logout = () => {
    logoutChreeidAccount()
    setAccount(null)
    setAccountError('')
  }

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return entries
    return entries.filter((entry) =>
      [entry.name, entry.author, entry.description, ...entry.categories, ...entry.keywords]
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalized),
    )
  }, [entries, query])

  return (
    <AppShell page="catalog" account={account} onLogin={login} onLogout={logout}>
      <ChreeidLinkPanel />
      {accountError && <Alert severity="error" sx={{ mb: 2 }}>{accountError}</Alert>}
      <TextField
        fullWidth
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('catalog.search_placeholder')}
        sx={{ mb: 2 }}
        slotProps={{
          htmlInput: { 'aria-label': t('catalog.search_aria') },
          input: {
            startAdornment: (
              <InputAdornment position="start">
              <Box component="svg" aria-hidden="true" viewBox="0 0 24 24" sx={{ width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 4 4" />
              </Box>
              </InputAdornment>
            ),
          },
        }}
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{
          my: 2.5,
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Typography role="status" color="text.secondary">
          {status === 'loading' && t('catalog.loading')}
          {status === 'ready' && t('catalog.count', { total: entries.length, shown: filtered.length })}
          {status === 'error' && t('catalog.failed')}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button component="a" href={`${import.meta.env.BASE_URL}data/index.json`} size="small">
            {t('catalog.json')}
          </Button>
          <Button component="a" href={`${import.meta.env.BASE_URL}data/wam.json`} size="small">
            {t('catalog.json_wam')}
          </Button>
        </Stack>
      </Stack>

      {status === 'loading' && <CircularProgress aria-label={t('catalog.loading_aria')} />}
      {status === 'error' && <Alert severity="error">{error}</Alert>}
      {status === 'ready' && filtered.length === 0 && (
        <Alert severity="info">{t('catalog.empty')}</Alert>
      )}
      {status === 'ready' && filtered.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          {filtered.map((entry) => <PluginCard key={entry.id} entry={entry} />)}
        </Box>
      )}
    </AppShell>
  )
}

initLang()
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error(t('app.root_missing'))
const root = import.meta.hot?.data.root ?? createRoot(rootElement)
if (import.meta.hot) import.meta.hot.data.root = root

root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>,
)
