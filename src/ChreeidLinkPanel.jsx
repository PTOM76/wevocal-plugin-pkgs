// Issue専用チャレンジを使ってChreeIDアカウントを任意で確認する画面。
import { useEffect, useState } from 'react'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { beginChreeidLogin, completeChreeidLogin, encryptChreeidProof } from './chreeid.js'

const ChreeidLinkPanel = () => {
  const [request, setRequest] = useState(null)
  const [proof, setProof] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
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
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason))
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
      setError(reason instanceof Error ? `コピーできませんでした: ${reason.message}` : String(reason))
    }
  }

  return (
    <Alert severity={proof ? 'success' : 'info'} sx={{ mb: 2 }}>
      <Stack spacing={1.5} sx={{ width: '100%' }}>
        <Typography variant="subtitle2">Issue #{request.issue} のChreeID連携</Typography>
        {!proof && (
          <>
            <Typography variant="body2">
              ChreeIDで認証し、発行された暗号化証明を元のGitHub Issueへコメントします。IDトークンはIssueに公開されません。
            </Typography>
            <Box>
              <Button
                variant="contained"
                onClick={() => beginChreeidLogin(request.issue, request.nonce).catch((reason) => {
                  setError(reason instanceof Error ? reason.message : String(reason))
                })}
              >
                ChreeIDで認証
              </Button>
            </Box>
          </>
        )}
        {proof && (
          <>
            <Typography variant="body2">
              このコマンドを Issue #{request.issue} にコメントすると、ActionsがGitHub投稿者との一致を検証します。
            </Typography>
            <TextField value={proof} multiline minRows={2} slotProps={{ htmlInput: { readOnly: true } }} />
            <Box>
              <Button variant="contained" onClick={copyProof}>
                {copied ? 'コピーしました' : 'コマンドをコピー'}
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
