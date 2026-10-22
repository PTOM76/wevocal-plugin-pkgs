import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  InputAdornment,
  Link,
  MenuItem,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material'
import ChreeidLinkPanel from './ChreeidLinkPanel.jsx'
import {
  beginChreeidAccountLogin,
  completeChreeidAccountLogin,
  getChreeidAccount,
  isChreeidAccountCallback,
  logoutChreeidAccount,
} from './chreeid.js'
import { fetchChreeidSubmissions } from './chreeidSubmissions.js'
import { errorText, initLang, setLang, t, useLang } from './i18n.js'
import { LANGS, LANG_NAMES, templateFile } from '../scripts/submission-i18n.mjs'

const catalogUrl = `${import.meta.env.BASE_URL}data/index.json`
const sourceUrl = 'https://github.com/PTOM76/wevocal-plugin-pkgs'
const submissionUrl = (lang) => `${sourceUrl}/issues/new?template=${templateFile(lang)}`

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb', dark: '#1d4ed8', light: '#3b82f6', contrastText: '#ffffff' },
    text: { primary: '#1f2937', secondary: '#6b7280', disabled: '#9ca3af' },
    success: { main: '#059669' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    background: { default: '#f9fafb', paper: '#ffffff' },
    divider: '#e5e7eb',
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", Meiryo, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { colorScheme: 'light' },
        body: { backgroundColor: '#f9fafb' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { transition: 'background-color 0.2s, border-color 0.2s, color 0.2s' },
        sizeSmall: { height: 32, padding: '0 12px', fontSize: '0.8125rem' },
        sizeMedium: { height: 40, padding: '0 16px', fontSize: '0.875rem' },
        outlined: { borderColor: '#d1d5db' },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
        sizeSmall: { height: 20, fontSize: '0.75rem' },
      },
    },
    MuiLink: { defaultProps: { underline: 'hover' } },
  },
})

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
  const lang = useLang()
  const [entries, setEntries] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [account, setAccount] = useState(getChreeidAccount)
  const [accountError, setAccountError] = useState('')
  const [submissions, setSubmissions] = useState([])
  const [submissionsStatus, setSubmissionsStatus] = useState('idle')

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

  useEffect(() => {
    if (!account) {
      setSubmissions([])
      setSubmissionsStatus('idle')
      return undefined
    }

    const controller = new AbortController()
    setSubmissionsStatus('loading')
    fetchChreeidSubmissions(account.sub, { signal: controller.signal })
      .then((items) => {
        setSubmissions(items)
        setSubmissionsStatus('ready')
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setAccountError(errorText(reason))
        setSubmissionsStatus('error')
      })
    return () => controller.abort()
  }, [account])

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
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{
          py: 1,
          bgcolor: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(8px)',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
      <Container maxWidth="md">
        <Toolbar disableGutters sx={{ minHeight: '40px !important' }}>
          <Typography
            variant="h6"
            component="div"
            noWrap
            sx={{ fontWeight: 700, flexGrow: 1, minWidth: 0, fontSize: { xs: '0.9rem', sm: '1.25rem' } }}
          >
            WeVocal Plugin Packages
          </Typography>
          <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} sx={{ flexShrink: 0 }}>
            <TextField
              select
              value={lang}
              onChange={(event) => setLang(event.target.value)}
              sx={{
                width: { xs: 96, sm: 112 },
                '& .MuiInputBase-root': { height: 32, fontSize: '0.8125rem' },
                '& .MuiSelect-select': { py: 0, pl: 1.5, display: 'flex', alignItems: 'center', minHeight: '0 !important' },
              }}
              slotProps={{ htmlInput: { 'aria-label': t('header.language') } }}
            >
              {LANGS.map((code) => <MenuItem key={code} value={code}>{LANG_NAMES[code]}</MenuItem>)}
            </TextField>
            {account ? (
              <Button onClick={logout} size="small">{t('header.logout')}</Button>
            ) : (
              <Button onClick={login} variant="outlined" size="small" aria-label={t('header.login_aria')}>
                {t('header.login')}
              </Button>
            )}
            <Button
              component="a"
              href={submissionUrl(lang)}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              size="small"
            >
              {t('header.submit')}
            </Button>
          </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Container component="main" maxWidth="md" sx={{ flexGrow: 1, pt: 3, pb: 8 }}>
        <ChreeidLinkPanel />
        {accountError && <Alert severity="error" sx={{ mb: 2 }}>{accountError}</Alert>}
        {account && (
          <Box component="section" aria-labelledby="my-submissions-heading" sx={{ mb: 3 }}>
            <Typography id="my-submissions-heading" component="h2" variant="h5" sx={{ mb: 0.5 }}>
              {t('submissions.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {t('submissions.note')}
            </Typography>
            {submissionsStatus === 'loading' && <CircularProgress aria-label={t('submissions.loading')} size={24} />}
            {submissionsStatus === 'error' && <Alert severity="error">{t('submissions.failed')}</Alert>}
            {submissionsStatus === 'ready' && submissions.length === 0 && (
              <Alert severity="info">
                {t('submissions.empty').split('{command}').flatMap((part, index) => (
                  index === 0 ? [part] : [<code key={index}>/link-chreeid</code>, part]
                ))}
              </Alert>
            )}
            {submissionsStatus === 'ready' && submissions.length > 0 && (
              <Stack spacing={1}>
                {submissions.map((submission) => (
                  <Card key={submission.number} variant="outlined">
                    <CardContent sx={{ pb: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                        <Typography component="h3" variant="subtitle1" sx={{ flexGrow: 1 }}>
                          {submission.title} #{submission.number}
                        </Typography>
                        <Chip size="small" label={submission.state === 'open' ? t('submissions.open') : t('submissions.closed')} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {new Intl.DateTimeFormat(lang.replace('_', '-'), { dateStyle: 'medium' }).format(new Date(submission.createdAt))}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ px: 2, pt: 0 }}>
                      <Button component="a" href={submission.url} target="_blank" rel="noopener noreferrer" size="small">
                        {t('submissions.view')}
                      </Button>
                    </CardActions>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        )}
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
      </Container>

      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 2 }}>
        <Container maxWidth="md">
          <Typography variant="body2" color="text.secondary">
            <Link href={sourceUrl} color="inherit" target="_blank" rel="noopener noreferrer">
              GitHub
            </Link>
          </Typography>
        </Container>
      </Box>
    </Box>
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
