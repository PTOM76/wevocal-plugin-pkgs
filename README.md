# WeVocal Plugin Packages

A public catalog of plugin metadata and installation URLs. Plugin binaries and
plugin source code are hosted by their authors; this repository stores only
catalog records.

## Catalog

- [`data/index.json`](./data/index.json) is the versioned catalog consumed by
  WeVocal Studio.
- [`data/plugins/`](./data/plugins/) contains one metadata document per plugin.
- The initial WebAudio Modules (WAM) entries are imported from the official
  community catalog. Their original metadata and hosted module URLs are kept;
  plugin files are not copied here.

The static directory is published as a browseable website using GitHub Pages.

## Adding entries

Run the **Register plugin** workflow from the Actions tab:

- `sync_wam` imports or refreshes metadata from the official WAM community list.
- `add` registers a WAM module URL, a WeVocal manifest URL, or a VST DLL URL.

The workflow creates a pull request for review; it never writes registrations
directly to `main`. Adding an entry does not download, mirror, or execute its
plugin files.

Entries use `type` values `wam`, `manifest`, or `vst`. WAM URLs point to the
original module hosted by the WAM community site. Manifest and VST URLs point
to the original provider.

## Local checks

```sh
node scripts/catalog.mjs sync-wam
node scripts/catalog.mjs validate
```

The repository has no runtime dependencies.
