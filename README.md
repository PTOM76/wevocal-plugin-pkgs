# WeVocal Plugin Packages
プラグインのメタデータとインストール URL を公開するカタログ。プラグインのバイナリファイルとソースコードは各作者がホストし、このリポジトリにはカタログ情報のみを保存する。

## カタログ
- [`data/index.json`](./data/index.json) は WeVocal Studio が利用するバージョン管理されたカタログ。
- [`data/plugins/`](./data/plugins/) にはプラグインごとのメタデータファイルを格納する。
- 初期登録されている WebAudio Modules（WAM）のエントリーは、公式コミュニティカタログから取り込んだもの。元のメタデータとホストされているモジュールの URL をそのまま保持し、プラグインファイル自体はコピーしない。

静的ファイルは GitHub Pages で公開し、ブラウザーから閲覧できるウェブサイトとして提供する。

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

実行時の依存パッケージは不要。
