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
```

カタログの同期と検証スクリプトの実行に Node.js 以外の依存パッケージは不要。ウェブサイトの開発・ビルドには上記の npm 依存パッケージを使う。
