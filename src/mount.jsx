// 各ページの入口で共通の起動処理（言語の判定、テーマ、描画先）。
import { useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { initLang, t } from './i18n.js'
import { useColorMode } from './colorMode.js'
import { createAppTheme } from './theme.js'

function Themed({ Component }) {
  const mode = useColorMode()
  const theme = useMemo(() => createAppTheme(mode), [mode])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Component />
    </ThemeProvider>
  )
}

export function mountApp(Component) {
  initLang()
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error(t('app.root_missing'))
  const root = import.meta.hot?.data.root ?? createRoot(rootElement)
  if (import.meta.hot) import.meta.hot.data.root = root

  root.render(<Themed Component={Component} />)
}
