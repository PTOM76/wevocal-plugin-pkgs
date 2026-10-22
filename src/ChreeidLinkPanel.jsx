// Issue専用チャレンジを使ってChreeIDアカウントを任意で確認する画面。
import { useEffect, useState } from 'react'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import {
  beginChreeidLogin,
  completeChreeidLogin,
  encryptChreeidProof,
  isChreeidAccountCallback,
} from './chreeid.js'
import { errorText, t, useLang } from './i18n.js'

const ChreeidLinkPanel = () => {
  useLang()
  const [request, setRequest] = useState(null)
  const [proof, setProof] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isChreeidAccountCallback(window.location.search)) return
    const params = new URLSearchParams(window.location.search)
    const issue = params.get('chreeid_issue')
    const nonce = params.get('chreeid_nonce')
    if (issue && nonce) setRequest({ issue, nonce })

    if (!params.has('code') && !params.has('error')) return
    const callbackSearch = window.location.search
    const currentUrl = `${window.location.pathname}${window.location.hash}`
    window.history.replaceState({}, '', currentUrl)

    let cancelled = false
    completeChreeidLogin(callbackSearch)
      .then(async (result) => {
        const encrypted = await encryptChreeidProof(result.idToken)
        if (!cancelled) {
          setRequest({ issue: result.issue })
          setProof(`/chreeid-proof ${encrypted}`)
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(errorText(reason))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!request && !error) return null
  if (!request) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>

  const copyProof = async () => {
    try {
      await navigator.clipboard.writeText(proof)
      setCopied(true)
      setError('')
    } catch (reason) {
      setError(t('link.copy_failed', { message: errorText(reason) }))
    }
  }

  return (
    <Alert severity={proof ? 'success' : 'info'} sx={{ mb: 2 }}>
      <Stack spacing={1.5} sx={{ width: '100%' }}>
        <Typography variant="subtitle2">{t('link.title', { issue: request.issue })}</Typography>
        {!proof && (
          <>
            <Typography variant="body2">
              {t('link.intro')}
            </Typography>
            <Box>
              <Button
                variant="contained"
                onClick={() => beginChreeidLogin(request.issue, request.nonce).catch((reason) => {
                  setError(errorText(reason))
                })}
              >
                {t('link.authenticate')}
              </Button>
            </Box>
          </>
        )}
        {proof && (
          <>
            <Typography variant="body2">
              {t('link.comment', { issue: request.issue })}
            </Typography>
            <TextField value={proof} multiline minRows={2} slotProps={{ htmlInput: { readOnly: true } }} />
            <Box>
              <Button variant="contained" onClick={copyProof}>
                {copied ? t('link.copied') : t('link.copy')}
              </Button>
            </Box>
          </>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Alert>
  )
}

export default ChreeidLinkPanel
