# WeVocal Plugin Packages
プラグインのメタデータとインストールURLを公開するWeVocal/Web Audio Modulesプラグインリスト/カタログ。
プラグインのバイナリファイルとソースコードは各作者がホストし、このリポジトリにはカタログ情報のみを保存する。

## カタログ
- [`data/index.json`](./data/index.json) は WeVocal Studio が利用するバージョン管理されたカタログ。
- [`data/plugins/`](./data/plugins/) にはプラグインごとのメタデータファイルを格納する。
- 初期登録されている WebAudio Modules（WAM）のエントリーは、公式コミュニティカタログから取り込んだもの。元のメタデータとホストされているモジュールの URL をそのまま保持し、プラグインファイル自体はコピーしない。

静的ファイルは GitHub Pages で公開し、ブラウザーから閲覧できるウェブサイトとして提供する。

## JSON 配信
- `data/index.json`：全プラグインの一覧。
- `data/wam.json`：WAM プラグインだけの一覧。
- `data/plugins/<id>.json`：個別プラグインのメタデータ。

GitHub Pages では、それぞれ `/data/index.json`、`/data/wam.json`、`/data/plugins/<id>.json` で取得できる。

## ウェブサイト
React と MUI で構成したカタログ画面から、プラグインを名前、作者、説明、カテゴリ、キーワードで検索できる。各プラグインのカードには配布元、作者サイト、個別 JSON へのリンクを表示する。

ChreeIDでログインすると、GitHub Issue上で同じChreeIDアカウントとの連携を確認した登録申請を一覧表示する。ログイン状態はこのブラウザーのlocalStorageに保持し、ログアウトすると削除する。申請内容と審査状態は公開GitHub Issueから取得する。

## 掲載申請
ウェブサイトの「登録申請」から GitHub Issue Form を開き、GitHub アカウントでプラグインのメタデータと配布 URL を送信する。GitHub Actions が入力を検証してレビュー用のプルリクエストを作成し、メンテナーが確認してから公開する。作者が公開しているURLのみを登録する。

投稿受付には Issues を有効にし、リポジトリ設定で GitHub Actions によるプルリクエスト作成を許可する必要がある。

## ページ
- `/`：プラグインのカタログと検索。ログインもここで行う。
- `/mypage/`：ChreeID連携済みの自分の登録申請の一覧。ログインしていないときはカタログへ移動する。

## 多言語対応
ウェブサイトは日本語、英語、韓国語、簡体字中国語、繁体字中国語に対応する。言語は URL の `?lang=`、ヘッダーで選んだ言語、ブラウザーの言語の順に決まる。訳文は `src/i18n/*.json` に置く。

掲載申請の Issue Form は言語ごとにテンプレートを用意し、サイトの「登録申請」は表示中の言語のテンプレートを開く。テンプレートは `scripts/submission-i18n.mjs` の文言から `node scripts/issue-templates.mjs` で生成する（`npm test` が最新かを確認する）。Issue のタイトルの接頭辞で言語を判別し、Actions の返信もその言語で投稿する。言語を足すときは `scripts/submission-i18n.mjs` と `src/i18n/` に追加する。

## 任意のChreeID連携
掲載申請を作成したIssueに投稿者本人が `/link-chreeid` とコメントすると、Issue専用のnonce付きログインリンクが返信される。ChreeIDで認証後に暗号化証明を同じIssueへコメントすると、GitHub ActionsがChreeIDの署名、宛先、nonce、有効期限とGitHub投稿者を検証する。IDトークンは公開Issueに載せず、成功時には明示的に同意したChreeID `sub` を公開コメントに記録する。ChreeID連携は任意で、Issue投稿やプラグイン審査の条件ではない。

有効化には次の設定が必要。

1. ChreeIDで公開OIDCクライアントを作成する。許可するリダイレクトURIは `https://plugins.wevocal.pitan76.net/`、スコープは `openid`、クライアントシークレットなし（PKCE / S256）にする。
2. ChreeIDをデプロイする。トークン交換（`/oauth/token`）と公開署名鍵（`/oauth/jwks`）のエンドポイントは、ブラウザーSPAから利用できるよう全OriginのCORSを許可する。資格情報（Cookie等）は許可せず、トークン交換は認可コード、登録済みリダイレクトURI、PKCEで保護する。他のエンドポイントにはこの許可を適用しない。
3. このリポジトリ用のRSA鍵ペアをローカルで生成する。これはChreeIDサービスの署名鍵ではなく、Issueに投稿する前にブラウザー上のIDトークンを暗号化し、Actionsだけが復号できるようにする鍵。PowerShellなどでOpenSSLを使い、次のコマンドで生成する。
   ```sh
   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out chreeid-link-private.pem
   openssl pkey -in chreeid-link-private.pem -pubout -outform DER | openssl base64 -A
   ```
   2行目の出力をGitHub Actions変数 `CHREEID_LINK_PUBLIC_KEY` に、`chreeid-link-private.pem` の内容をActions Secret `CHREEID_LINK_PRIVATE_KEY` に設定する。秘密鍵はリポジトリへ追加しない。
4. ChreeIDに登録した公開OIDCクライアントのクライアントIDを、GitHub Actions変数 `CHREEID_CLIENT_ID` に設定する。これはアカウントのパスワードや秘密鍵ではない。

Pagesのビルドで公開用の `CHREEID_CLIENT_ID` と暗号化用公開鍵がフロントエンドへ渡る。ChreeIDクライアントの登録、鍵とActions変数/Secretが揃うまでは連携を利用できない。

ローカルで画面を確認・ビルドするには、Node.js 22 を用意して次を実行する。
```sh
npm ci
npm run dev
```

本番用のビルドは `npm run build` で `dist/` に生成する。GitHub Pages のデプロイではビルド後に `data/` も配置して公開する。

## プラグインの更新
登録済みの ID を更新するときは、同じ ID で掲載申請をもう一度出す。更新できるのは、最初にその ID を登録した投稿者（GitHub アカウント）だけで、別のアカウントからの申請は失敗する。更新の申請も、レビュー用のプルリクエストになる。更新で書き換わるのは、種別、名前、作者、配布リンク、説明、作者サイト、カテゴリ。サムネイルなどはそのまま残る。

登録した投稿者は `data/plugins/<id>.json` の `submitter` に記録する。投稿者の記録がないもの（最初から入っていた WAM、メンテナーが登録したもの）は、メンテナーが下の「メンテナーの操作」で `submitter` を設定するまで、掲載申請では更新できない。

## 既存のプラグインの紐づけ
投稿者が未設定の既存のプラグイン（最初から入っていた WAM、メンテナーが登録したもの）は、持ち主が掲載申請で自分に紐づけられる。紐づけも、同じ ID で掲載申請を出すだけでよい。Actions が、**今カタログに登録されている配布リンク**の持ち主であることを、次のどちらかで確認して、できたら投稿者に設定したうえで申請の内容に更新する（レビュー用のプルリクエストになる）。

1. 配布リンクが、そのアカウントの GitHub 上にある：`https://<ユーザー名>.github.io/…`、`https://github.com/<ユーザー名>/…`、`https://raw.githubusercontent.com/<ユーザー名>/…`
2. 配布元の情報に、自分の GitHub ユーザー名を書いておく：WAM は配布リンクと同じフォルダーの `descriptor.json`、マニフェストは配布リンクの JSON に、`"githubOwner": "<ユーザー名>"` を足して公開してから申請する（申請が通ったあとは消してよい）。

どちらでも確認できないとき（VST の DLL を他のサイトに置いている場合など）は、メンテナーが「メンテナーの操作」の `更新` で `submitter` を設定する。確認に使うのは登録済みの配布リンクで、申請で渡した新しい URL ではない（他人が自分の URL を持ち込んで乗っ取れないようにするため）。

## 版の反映
WAM は配布リンクと同じフォルダーの `descriptor.json`、マニフェストは配布リンクの JSON から、`version` を読んで `data/plugins/<id>.json` に反映する。掲載申請の登録、更新、紐づけのたびに確認する。読めないとき（VST など）は、今の版をそのまま残す。WeVocal の更新は、WAM 自身の `descriptor.json` の `version` を導入済みのものと比べるので、プラグインを更新したら `version` を上げる。

## プラグインの取り下げ
登録した投稿者は、掲載の取り下げを申請できる。ウェブサイトのマイページで「自分のプラグイン」の「取り下げを申請」を押すか、GitHub の新しい Issue で「プラグイン取り下げ」のフォームを選び、取り下げるプラグインの ID を入れて投稿する。フォームも言語ごとに用意してある。Actions が、投稿者が最初にその ID を登録したアカウントと同じことを確認して、削除のレビュー用プルリクエストを作る。別のアカウントの申請や、投稿者の記録がないプラグインの申請は、失敗して Issue にその旨が返る（メンテナーに連絡するか、メンテナーの操作で削除する）。

## メンテナーの操作
Actions タブから Register plugin ワークフローを実行する。結果はレビュー用のプルリクエストになり、登録情報を直接 `main` ブランチに書き込むことはない。

- `WAMカタログを同期`：公式 WAM コミュニティリストからメタデータを取り込み、または更新する。
- `登録`：WAM モジュールの URL、WeVocal マニフェストの URL、または VST DLL の URL を登録する（投稿者も設定できる）。
- `更新`：`id` で指定したエントリーを、入力した項目だけ書き換える（空の項目は変えない。投稿者の設定にも使う）。
- `削除`：`id` で指定したエントリーを消す。

エントリーを追加しても、プラグインファイルのダウンロード、ミラーリング、実行は行わない。

エントリーの `type` には `wam`、`manifest`、`vst` のいずれかを指定する。

- `wam`：WAM コミュニティサイトでホストされている元のモジュールの URL。
- `manifest`：提供元がホストしているマニフェストの URL。
- `vst`：提供元がホストしている VST DLL の URL。

## ローカルでの検証
```sh
node scripts/catalog.mjs sync-wam
node scripts/catalog.mjs validate
npm test
```

カタログの同期と検証スクリプトの実行に Node.js 以外の依存パッケージは不要。ウェブサイトの開発・ビルドには上記の npm 依存パッケージを使う。
