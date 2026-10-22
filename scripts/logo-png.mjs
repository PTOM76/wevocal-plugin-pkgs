// public/favicon.svg（ロゴ）から PNG を書き出す。`npm run logo` で public/ の PNG を作り直す。
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))
const outputs = { 'icon-512.png': 512, 'icon-192.png': 192, 'apple-touch-icon.png': 180 }

const svg = await readFile(`${publicDir}favicon.svg`)
for (const [name, size] of Object.entries(outputs)) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  await writeFile(`${publicDir}${name}`, png)
  console.log(`${name} (${size}px)`)
}
