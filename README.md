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

## エントリーの追加
Actions タブから Register plugin ワークフローを実行する。

- `sync_wam`：公式 WAM コミュニティリストからメタデータを取り込み、または更新する。
- `add`：WAM モジュールの URL、WeVocal マニフェストの URL、または VST DLL の URL を登録する。

ワークフローはレビュー用のプルリクエストを作成し、登録情報を直接 `main` ブランチに書き込むことはない。

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
