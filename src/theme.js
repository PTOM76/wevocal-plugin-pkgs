// サイト全体の MUI テーマ。
import { createTheme } from '@mui/material'

export const theme = createTheme({
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

