// サイト全体の MUI テーマ（ライトとダーク）。
import { createTheme } from '@mui/material'

const palettes = {
  light: {
    mode: 'light',
    primary: { main: '#2563eb', dark: '#1d4ed8', light: '#3b82f6', contrastText: '#ffffff' },
    text: { primary: '#1f2937', secondary: '#6b7280', disabled: '#9ca3af' },
    success: { main: '#059669' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    background: { default: '#f9fafb', paper: '#ffffff' },
    divider: '#e5e7eb',
  },
  // WeVocal Synth / Studio（PevenMUI）のダークテーマと同じ灰色の配色
  dark: {
    mode: 'dark',
    primary: { main: '#8ab4f8', dark: '#669df6', light: '#aecbfa', contrastText: '#202124' },
    text: { primary: '#e8eaed', secondary: '#9aa0a6', disabled: '#5f6368' },
    success: { main: '#81c995' },
    warning: { main: '#fdd663' },
    error: { main: '#f28b82' },
    background: { default: '#202124', paper: '#292a2d' },
    divider: '#5f6368',
  },
}

export const createAppTheme = (mode) => createTheme({
  palette: palettes[mode],
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", Meiryo, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { colorScheme: mode },
        body: { backgroundColor: palettes[mode].background.default },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { transition: 'background-color 0.2s, border-color 0.2s, color 0.2s' },
        sizeSmall: { height: 32, padding: '0 12px', fontSize: '0.8125rem' },
        sizeMedium: { height: 40, padding: '0 16px', fontSize: '0.875rem' },
        outlined: { borderColor: mode === 'dark' ? '#5f6368' : '#d1d5db' },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: { styleOverrides: { root: { borderRadius: 2 } } },
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

