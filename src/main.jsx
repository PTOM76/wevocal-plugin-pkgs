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
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'

const catalogUrl = `${import.meta.env.BASE_URL}data/index.json`
const sourceUrl = 'https://github.com/PTOM76/wevocal-plugin-pkgs'

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
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography component="h2" variant="h6" sx={{ flexGrow: 1, lineHeight: 1.3 }}>
            {entry.name}
          </Typography>
          <Chip size="small" label={entry.type.toUpperCase()} variant="outlined" />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {entry.author}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-line' }}>
          {entry.description || '説明はありません。'}
        </Typography>
        {!!entry.categories.length && (
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
            {entry.categories.map((category) => (
              <Chip key={category} size="small" label={category} />
            ))}
          </Stack>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 0, flexWrap: 'wrap' }}>
        {pluginUrl && (
          <Button component="a" href={pluginUrl} target="_blank" rel="noopener noreferrer" size="small">
            配布元
          </Button>
        )}
        {website && (
          <Button component="a" href={website} target="_blank" rel="noopener noreferrer" size="small">
            作者サイト
          </Button>
        )}
        <Button component="a" href={metadataUrl} size="small">
          JSON
        </Button>
      </CardActions>
    </Card>
  )
}

function App() {
  const [entries, setEntries] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch(catalogUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((catalog) => {
        if (catalog.version !== 1 || !Array.isArray(catalog.plugins)) {
          throw new Error('カタログの形式に対応していません')
        }
        setEntries(catalog.plugins)
        setStatus('ready')
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : String(reason))
        setStatus('error')
      })
    return () => controller.abort()
  }, [])

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
        <Typography variant="h6" component="div" sx={{ fontWeight: 700, flexGrow: 1 }}>
          WeVocal プラグイン
        </Typography>
          <Button component="a" href={sourceUrl} target="_blank" rel="noopener noreferrer" color="inherit">
            カタログのソース
          </Button>
          </Toolbar>
        </Container>
      </AppBar>

      <Container component="main" maxWidth="md" sx={{ flexGrow: 1, pt: 3, pb: 8 }}>
        <Typography
          variant="h1"
          component="h1"
          sx={{ fontSize: '1.375rem', fontWeight: 700, pb: 1, mb: 1, borderBottom: '2px solid', borderColor: 'divider' }}
        >
          プラグインカタログ
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: '0.875rem', mb: 2 }}>
          作者が配信しているプラグインを検索できます。インストールは WeVocal Studio / Synth から行ってください。
        </Typography>
        <TextField
          fullWidth
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="名前、作者、カテゴリで検索"
          inputProps={{ 'aria-label': 'プラグインを検索' }}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          sx={{ my: 2.5 }}
        >
          <Typography role="status" color="text.secondary">
            {status === 'loading' && 'カタログを読み込んでいます…'}
            {status === 'ready' && `${entries.length} 件中 ${filtered.length} 件を表示`}
            {status === 'error' && 'カタログを読み込めませんでした'}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button component="a" href={`${import.meta.env.BASE_URL}data/index.json`} size="small">
              カタログ JSON
            </Button>
            <Button component="a" href={`${import.meta.env.BASE_URL}data/wam.json`} size="small">
              WAM のみの JSON
            </Button>
          </Stack>
        </Stack>

        {status === 'loading' && <CircularProgress aria-label="読み込み中" />}
        {status === 'error' && <Alert severity="error">{error}</Alert>}
        {status === 'ready' && filtered.length === 0 && (
          <Alert severity="info">一致するプラグインはありません。</Alert>
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
            プラグイン本体は各作者の配信元から取得します。{' '}
            <Link href={sourceUrl} color="inherit" target="_blank" rel="noopener noreferrer">
              GitHub
            </Link>
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}

createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>,
)
