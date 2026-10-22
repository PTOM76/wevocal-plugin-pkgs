// ログイン中の ChreeID に連携済みの登録申請の一覧（マイページ）。
import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material'
import { submissionUrl } from './AppShell.jsx'
import { isAbort } from './abort.js'
import MyPlugins from './MyPlugins.jsx'
import { fetchChreeidSubmissions } from './chreeidSubmissions.js'
import { errorText, t, useLang } from './i18n.js'

export default function SubmissionsList({ account }) {
  const lang = useLang()
  const [submissions, setSubmissions] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    fetchChreeidSubmissions(account.sub, { signal: controller.signal })
      .then((items) => {
        setSubmissions(items)
        setStatus('ready')
      })
      .catch((reason) => {
        if (isAbort(reason)) return
        setError(errorText(reason))
        setStatus('error')
      })
    return () => controller.abort()
  }, [account])

  // 連携済みの申請を出した GitHub アカウント。この人たちが登録したプラグインを「自分のプラグイン」に出す
  const logins = new Set(submissions.map((submission) => submission.login.toLowerCase()).filter(Boolean))

  return (
    <>
    {status === 'ready' && <MyPlugins logins={logins} />}
    <Box component="section" aria-labelledby="my-submissions-heading">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
        <Typography id="my-submissions-heading" component="h2" variant="h5" sx={{ flexGrow: 1 }}>
          {t('submissions.title')}
        </Typography>
        <Button component="a" href={submissionUrl(lang)} target="_blank" rel="noopener noreferrer" variant="contained" size="small">
          {t('header.submit')}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t('submissions.note')}
      </Typography>
      {status === 'loading' && <CircularProgress aria-label={t('submissions.loading')} size={24} />}
      {status === 'error' && <Alert severity="error">{error || t('submissions.failed')}</Alert>}
      {status === 'ready' && submissions.length === 0 && (
        <Alert severity="info">
          {t('submissions.empty').split('{command}').flatMap((part, index) => (
            index === 0 ? [part] : [<code key={index}>/link-chreeid</code>, part]
          ))}
        </Alert>
      )}
      {status === 'ready' && submissions.length > 0 && (
        <Stack spacing={1}>
          {submissions.map((submission) => (
            <Card key={submission.number} variant="outlined">
              <CardContent sx={{ pb: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                  <Typography component="h3" variant="subtitle1" sx={{ flexGrow: 1 }}>
                    {submission.title} #{submission.number}
                  </Typography>
                  <Chip size="small" label={submission.state === 'open' ? t('submissions.open') : t('submissions.closed')} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {new Intl.DateTimeFormat(lang.replace('_', '-'), { dateStyle: 'medium' }).format(new Date(submission.createdAt))}
                </Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pt: 0 }}>
                <Button component="a" href={submission.url} target="_blank" rel="noopener noreferrer" size="small">
                  {t('submissions.view')}
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
    </>
  )
}
