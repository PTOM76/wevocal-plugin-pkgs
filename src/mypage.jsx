// マイページの入口。ログイン中の ChreeID に連携済みの登録申請を一覧する。
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import AppShell, { catalogPath } from './AppShell.jsx'
import SubmissionsList from './SubmissionsList.jsx'
import { getChreeidAccount, logoutChreeidAccount } from './chreeid.js'
import { initLang, t } from './i18n.js'
import { theme } from './theme.js'

const account = getChreeidAccount()

// ログインしていなければカタログへ戻す（ログインはカタログのページで行う）
if (!account) window.location.replace(catalogPath)

function MyPage() {
  const logout = () => {
    logoutChreeidAccount()
    window.location.assign(catalogPath)
  }

  return (
    <AppShell page="mypage" account={account} onLogin={() => window.location.assign(catalogPath)} onLogout={logout}>
      {account && <SubmissionsList account={account} />}
    </AppShell>
  )
}

initLang()
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error(t('app.root_missing'))
createRoot(rootElement).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <MyPage />
  </ThemeProvider>,
)
