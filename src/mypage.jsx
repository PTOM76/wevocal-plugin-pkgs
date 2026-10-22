// マイページの入口。ログイン中の ChreeID に連携済みの登録申請を一覧する。
import AppShell, { catalogPath } from './AppShell.jsx'
import SubmissionsList from './SubmissionsList.jsx'
import { getChreeidAccount, logoutChreeidAccount } from './chreeid.js'
import { mountApp } from './mount.jsx'

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

mountApp(MyPage)
