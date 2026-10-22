// 登録申請の多言語定義（言語一覧、Issue のタイトル接頭辞、項目名、フォームと返信の文言）。サイトと Actions で共有する。

export const LANGS = ['ja', 'en', 'ko', 'zh_cn', 'zh_tw']
export const DEFAULT_LANG = 'ja'

export const LANG_NAMES = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh_cn: '简体中文',
  zh_tw: '繁體中文',
}

// 申請 Issue のタイトルの先頭。言語はここから判別する
export const TITLE_PREFIX = {
  ja: '[プラグイン登録]',
  en: '[Plugin submission]',
  ko: '[플러그인 등록]',
  zh_cn: '[插件登记]',
  zh_tw: '[外掛登錄]',
}

// 言語ごとのテンプレートのファイル名（日本語は従来のまま）
export function templateFile(lang) {
  return lang === 'ja' ? 'plugin-submission.yml' : `plugin-submission.${lang}.yml`
}

export function langOfTitle(title) {
  if (typeof title !== 'string') return null
  return LANGS.find((lang) => title.startsWith(TITLE_PREFIX[lang])) ?? null
}

export function isSubmissionTitle(title) {
  return langOfTitle(title) !== null
}

// Issue Form の項目の順序と、言語ごとの表示名
export const FIELDS = ['type', 'id', 'name', 'author', 'url', 'description', 'website', 'categories']

export const FIELD_LABELS = {
  type: { ja: '種別', en: 'Type', ko: '종류', zh_cn: '类型', zh_tw: '類型' },
  id: { ja: 'ID', en: 'ID', ko: 'ID', zh_cn: 'ID', zh_tw: 'ID' },
  name: { ja: 'プラグイン名', en: 'Plugin name', ko: '플러그인 이름', zh_cn: '插件名称', zh_tw: '外掛名稱' },
  author: { ja: '作者', en: 'Author', ko: '작성자', zh_cn: '作者', zh_tw: '作者' },
  url: { ja: '配布リンク', en: 'Distribution link', ko: '배포 링크', zh_cn: '分发链接', zh_tw: '發佈連結' },
  description: {
    ja: '説明（任意）',
    en: 'Description (optional)',
    ko: '설명 (선택)',
    zh_cn: '说明（可选）',
    zh_tw: '說明（選填）',
  },
  website: {
    ja: '作者サイト（任意）',
    en: 'Author website (optional)',
    ko: '작성자 사이트 (선택)',
    zh_cn: '作者网站（可选）',
    zh_tw: '作者網站（選填）',
  },
  categories: {
    ja: 'カテゴリ（カンマ区切り、任意）',
    en: 'Categories (comma-separated, optional)',
    ko: '카테고리 (쉼표로 구분, 선택)',
    zh_cn: '分类（用逗号分隔，可选）',
    zh_tw: '分類（以逗號分隔，選填）',
  },
}

// 項目名（どの言語でも）から項目のキーを引く
export const FIELD_BY_LABEL = new Map(
  FIELDS.flatMap((key) => LANGS.map((lang) => [FIELD_LABELS[key][lang], key])),
)

// Issue Form テンプレートの文言
export const TEMPLATE_TEXT = {
  ja: {
    name: 'プラグイン登録',
    description: 'プラグインのメタデータと配布リンクの掲載を申請',
    intro: 'GitHub アカウントで投稿者を確認します。必須なのは配布リンクだけです。種別、ID、名前、作者などは、空のままにすると、配布元の情報（WAM は同じフォルダーの descriptor.json、マニフェストはその JSON）から自動で入ります。入力した項目は、そちらより優先されます。',
    idHint: '任意。空なら配布元の情報から決まります。小文字の英数字、ピリオド、ハイフン、アンダースコアを使用してください（2〜96文字）。',
    autoHint: '任意。空なら配布元の情報から決まります。',
    urlHint: '種別に応じた WAM JavaScript、JSON マニフェスト、または VST DLL の HTTPS URL。',
    websiteHint: 'HTTPS URL を入力してください。',
  },
  en: {
    name: 'Plugin submission',
    description: 'Request to list a plugin’s metadata and distribution link',
    intro: 'Your GitHub account is used to confirm the submitter. Only the distribution link is required. If you leave the type, ID, name, author and so on empty, they are filled in from the distributor’s own information (descriptor.json in the same folder for a WAM, or the manifest JSON). Anything you type takes priority.',
    idHint: 'Optional. If empty, it comes from the distributor’s information. Use lowercase letters, digits, periods, hyphens and underscores (2 to 96 characters).',
    autoHint: 'Optional. If empty, it comes from the distributor’s information.',
    urlHint: 'An HTTPS URL of a WAM JavaScript file, a JSON manifest or a VST DLL, matching the type.',
    websiteHint: 'Enter an HTTPS URL.',
  },
  ko: {
    name: '플러그인 등록',
    description: '플러그인 메타데이터와 배포 링크의 게재를 신청',
    intro: 'GitHub 계정으로 제출자를 확인합니다. 필수 항목은 배포 링크뿐입니다. 종류, ID, 이름, 작성자 등을 비워 두면 배포처의 정보(WAM은 같은 폴더의 descriptor.json, 매니페스트는 그 JSON)에서 자동으로 채워집니다. 입력한 항목이 우선합니다.',
    idHint: '선택. 비워 두면 배포처의 정보로 정해집니다. 영문 소문자, 숫자, 마침표, 하이픈, 밑줄을 사용하세요 (2~96자).',
    autoHint: '선택. 비워 두면 배포처의 정보로 정해집니다.',
    urlHint: '종류에 맞는 WAM JavaScript, JSON 매니페스트 또는 VST DLL의 HTTPS URL.',
    websiteHint: 'HTTPS URL을 입력하세요.',
  },
  zh_cn: {
    name: '插件登记',
    description: '申请收录插件的元数据和分发链接',
    intro: '通过 GitHub 账号确认提交者。只有分发链接是必填项。类型、ID、名称、作者等留空时，会从分发方的信息（WAM 为同一文件夹的 descriptor.json，清单则为该 JSON）自动填入。你填写的内容优先。',
    idHint: '可选。留空则由分发方的信息决定。请使用小写字母、数字、句点、连字符和下划线（2 至 96 个字符）。',
    autoHint: '可选。留空则由分发方的信息决定。',
    urlHint: '与类型对应的 WAM JavaScript、JSON 清单或 VST DLL 的 HTTPS URL。',
    websiteHint: '请输入 HTTPS URL。',
  },
  zh_tw: {
    name: '外掛登錄',
    description: '申請收錄外掛的中繼資料與發佈連結',
    intro: '透過 GitHub 帳號確認提交者。只有發佈連結為必填。類型、ID、名稱、作者等留空時，會從發佈者的資訊（WAM 為同一資料夾的 descriptor.json，資訊清單則為該 JSON）自動填入。你填寫的內容優先。',
    idHint: '選填。留空則由發佈者的資訊決定。請使用小寫英數字、句點、連字號與底線（2 至 96 個字元）。',
    autoHint: '選填。留空則由發佈者的資訊決定。',
    urlHint: '與類型對應的 WAM JavaScript、JSON 資訊清單或 VST DLL 的 HTTPS URL。',
    websiteHint: '請輸入 HTTPS URL。',
  },
}

// Actions が Issue に返信する文言
export const REPLY_TEXT = {
  ja: {
    received: (marker) => `${marker}\n投稿を受け付けました。内容を検証して、レビュー用のプルリクエストを作成します。\n\n**任意でChreeIDと連携する場合**は、このIssueに投稿者本人が \`/link-chreeid\` とコメントしてください。返信される認証リンクを開いてChreeIDにログインし、画面に表示された \`/chreeid-proof ...\` コマンドを同じIssueへコメントすると連携完了です。認証後、このサイトにログインすると連携済みの申請を一覧できます。\n\n連携は任意です。申請や審査には影響しません。`,
    pullRequest: (number) => `レビュー用の PR #${number} を作成しました。確認後にメンテナーがマージします。`,
    failed: '投稿を自動処理できませんでした。入力内容を確認するか、メンテナーに連絡してください。登録済みの ID を更新できるのは、最初に登録した投稿者だけです。投稿者が未設定のプラグインを自分のものとして紐づけるには、README の「既存のプラグインの紐づけ」を参照してください。',
    linkStart: (url) => `[ChreeID連携を開始する](${url})\n\n認証後、画面のコマンドをこのIssueにコメントしてください。`,
    alreadyLinked: 'このIssueはすでにChreeID連携済みです。',
    linked: (sub, login) => `ChreeIDアカウントとの連携を確認しました。\n\n- ChreeID sub: \`${sub}\`\n- GitHub投稿者: @${login}`,
    linkFailed: 'ChreeID連携を確認できませんでした。Issue投稿者本人が最新の連携リンクを使ってください。',
  },
  en: {
    received: (marker) => `${marker}\nYour submission has been received. We will validate it and create a pull request for review.\n\n**To optionally link your ChreeID**, the submitter comments \`/link-chreeid\` on this issue. Open the authentication link in the reply, sign in to ChreeID, then comment the \`/chreeid-proof ...\` command shown on the page on the same issue to finish linking. After that, signing in to the site lists your linked submissions.\n\nLinking is optional and does not affect the submission or its review.`,
    pullRequest: (number) => `Created PR #${number} for review. A maintainer will merge it after checking.`,
    failed: 'The submission could not be processed automatically. Please check your input or contact a maintainer. Only the original submitter can update an ID that is already registered. To link an existing plugin that has no submitter, see "Linking an existing plugin" (既存のプラグインの紐づけ) in the README.',
    linkStart: (url) => `[Start ChreeID linking](${url})\n\nAfter authenticating, comment the command shown on the page on this issue.`,
    alreadyLinked: 'This issue is already linked to a ChreeID account.',
    linked: (sub, login) => `The link to the ChreeID account has been confirmed.\n\n- ChreeID sub: \`${sub}\`\n- GitHub submitter: @${login}`,
    linkFailed: 'Could not confirm the ChreeID link. The issue submitter must use the latest link.',
  },
  ko: {
    received: (marker) => `${marker}\n제출을 접수했습니다. 내용을 검증한 뒤 검토용 풀 리퀘스트를 만듭니다.\n\n**선택적으로 ChreeID와 연동하려면** 제출자 본인이 이 Issue에 \`/link-chreeid\`라고 댓글을 남기세요. 답글로 받은 인증 링크를 열어 ChreeID에 로그인하고, 화면에 표시된 \`/chreeid-proof ...\` 명령을 같은 Issue에 댓글로 남기면 연동이 완료됩니다. 인증 후 이 사이트에 로그인하면 연동된 신청을 목록으로 볼 수 있습니다.\n\n연동은 선택 사항이며 신청과 심사에 영향을 주지 않습니다.`,
    pullRequest: (number) => `검토용 PR #${number}을(를) 만들었습니다. 확인 후 메인테이너가 병합합니다.`,
    failed: '제출을 자동으로 처리하지 못했습니다. 입력 내용을 확인하거나 메인테이너에게 문의하세요. 이미 등록된 ID는 처음 등록한 제출자만 업데이트할 수 있습니다. 제출자가 없는 기존 플러그인을 연결하려면 README의 “既存のプラグインの紐づけ” 항목을 참고하세요.',
    linkStart: (url) => `[ChreeID 연동 시작](${url})\n\n인증 후 화면에 표시된 명령을 이 Issue에 댓글로 남기세요.`,
    alreadyLinked: '이 Issue는 이미 ChreeID와 연동되어 있습니다.',
    linked: (sub, login) => `ChreeID 계정과의 연동을 확인했습니다.\n\n- ChreeID sub: \`${sub}\`\n- GitHub 제출자: @${login}`,
    linkFailed: 'ChreeID 연동을 확인하지 못했습니다. Issue 제출자 본인이 최신 연동 링크를 사용하세요.',
  },
  zh_cn: {
    received: (marker) => `${marker}\n已收到提交。我们将验证内容并创建用于审核的拉取请求。\n\n**如需选择性关联 ChreeID**，请由提交者本人在此 Issue 中评论 \`/link-chreeid\`。打开回复中的认证链接并登录 ChreeID，再将页面上显示的 \`/chreeid-proof ...\` 命令评论到同一个 Issue，即可完成关联。认证后登录本网站，可以查看已关联的申请。\n\n关联是可选的，不影响申请和审核。`,
    pullRequest: (number) => `已创建用于审核的 PR #${number}。确认后由维护者合并。`,
    failed: '无法自动处理此提交。请检查输入内容，或联系维护者。已登记的 ID 只有最初的提交者才能更新。要把尚无提交者的现有插件关联到自己名下，请参阅 README 中的“既存のプラグインの紐づけ”。',
    linkStart: (url) => `[开始关联 ChreeID](${url})\n\n认证后，请将页面上显示的命令评论到此 Issue。`,
    alreadyLinked: '此 Issue 已关联 ChreeID。',
    linked: (sub, login) => `已确认与 ChreeID 账号的关联。\n\n- ChreeID sub: \`${sub}\`\n- GitHub 提交者: @${login}`,
    linkFailed: '无法确认 ChreeID 关联。请由 Issue 提交者本人使用最新的关联链接。',
  },
  zh_tw: {
    received: (marker) => `${marker}\n已收到提交。我們將驗證內容並建立供審查的 Pull Request。\n\n**若要選擇性連結 ChreeID**，請由提交者本人在此 Issue 留言 \`/link-chreeid\`。開啟回覆中的驗證連結並登入 ChreeID，再將畫面上顯示的 \`/chreeid-proof ...\` 指令留言到同一個 Issue，即完成連結。驗證後登入本網站，即可查看已連結的申請。\n\n連結為選填，不影響申請與審查。`,
    pullRequest: (number) => `已建立供審查的 PR #${number}。確認後由維護者合併。`,
    failed: '無法自動處理此提交。請檢查輸入內容，或聯絡維護者。已登錄的 ID 只有最初的提交者才能更新。要把尚無提交者的現有外掛連結到自己名下，請參閱 README 中的「既存のプラグインの紐づけ」。',
    linkStart: (url) => `[開始連結 ChreeID](${url})\n\n驗證後，請將畫面上顯示的指令留言到此 Issue。`,
    alreadyLinked: '此 Issue 已連結 ChreeID。',
    linked: (sub, login) => `已確認與 ChreeID 帳號的連結。\n\n- ChreeID sub: \`${sub}\`\n- GitHub 提交者: @${login}`,
    linkFailed: '無法確認 ChreeID 連結。請由 Issue 提交者本人使用最新的連結。',
  },
}

export function replyText(lang, key, ...args) {
  const value = REPLY_TEXT[lang ?? DEFAULT_LANG][key]
  return typeof value === 'function' ? value(...args) : value
}
