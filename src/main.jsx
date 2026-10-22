// カタログページの入口。プラグインの検索と一覧、ChreeID のログインを扱う。
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { isAbort } from './abort.js'
import AppShell from './AppShell.jsx'
import ChreeidLinkPanel from './ChreeidLinkPanel.jsx'
import PluginCard from './PluginCard.jsx'
import {
  beginChreeidAccountLogin,
  completeChreeidAccountLogin,
  getChreeidAccount,
  isChreeidAccountCallback,
  logoutChreeidAccount,
} from './chreeid.js'
import { errorText, t, useLang } from './i18n.js'
import { mountApp } from './mount.jsx'

const catalogUrl = `${import.meta.env.BASE_URL}data/index.json`

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
        if (isAbort(reason)) return
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

mountApp(App)
