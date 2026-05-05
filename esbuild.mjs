import path from 'node:path'
import esbuild from 'esbuild'
import { nodeModulesPolyfillPlugin } from 'esbuild-plugins-node-modules-polyfill'

// Node.js target build
await esbuild.build({
  entryPoints: [path.join(process.cwd(), 'index.js')],
  loader: { '.xml': 'text' },
  outdir: path.join(process.cwd(), 'dist', 'commonjs'),
  target: 'node18',
  bundle: true,
  sourcemap: true,
  platform: 'node',
  define: {
    'import.meta.env': 'undefined',
  },
})

// Browser target build — output is consumed by Vite/Webpack browser bundlers.
// files.js is redirected to files.browser.js so that node:fs/promises is never
// imported. Bundled schemas are inlined via esbuild's text loader (see
// src/schema/config.js), so the local schema cache works offline in the
// browser as it does in Node. Schemas not in the bundle fall through to
// loadRemoteSchema() and are fetched from GitHub at runtime.
const browserFilesAlias = {
  name: 'browser-files-alias',
  setup(build) {
    build.onResolve({ filter: /\/utils\/files$/ }, () => ({
      path: path.join(process.cwd(), 'src/utils/files.browser.js'),
    }))
  },
}

await esbuild.build({
  entryPoints: [path.join(process.cwd(), 'index.js')],
  loader: { '.xml': 'text' },
  outdir: path.join(process.cwd(), 'dist', 'esm'),
  bundle: true,
  sourcemap: true,
  format: 'esm',
  external: ['pluralize'],
  platform: 'browser',
  plugins: [browserFilesAlias, nodeModulesPolyfillPlugin()],
})
