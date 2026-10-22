// ヘッダー（言語、ログイン、各ページへのリンク）とフッターを持つ共通の枠。
import {
  AppBar,
  Box,
  Button,
  Container,
  Link,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { setLang, t, useLang } from './i18n.js'
import { LANGS, LANG_NAMES, templateFile } from '../scripts/submission-i18n.mjs'

const base = import.meta.env.BASE_URL
const sourceUrl = 'https://github.com/PTOM76/wevocal-plugin-pkgs'
const submissionUrl = (lang) => `${sourceUrl}/issues/new?template=${templateFile(lang)}`

export const catalogPath = base
export const mypagePath = `${base}mypage/`

// page は 'catalog' か 'mypage'。ログイン中は反対側のページへのボタンを出す
export default function AppShell({ page, account, onLogin, onLogout, children }) {
  const lang = useLang()
  const onMypage = page === 'mypage'

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
              <Link href={catalogPath} color="inherit" underline="none">WeVocal Plugin Packages</Link>
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
              {account && (
                <Button component="a" href={onMypage ? catalogPath : mypagePath} size="small">
                  {onMypage ? t('nav.catalog') : t('nav.mypage')}
                </Button>
              )}
              {account ? (
                <Button onClick={onLogout} size="small">{t('header.logout')}</Button>
              ) : (
                <Button onClick={onLogin} variant="outlined" size="small" aria-label={t('header.login_aria')}>
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
        {children}
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
