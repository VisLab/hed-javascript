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
// imported, and __IS_BROWSER__ is set so config.js skips bundled-schema loading
// (schemas are fetched remotely via fetch() in the browser instead).
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
  define: {
    __IS_BROWSER__: 'true',
  },
  plugins: [browserFilesAlias, nodeModulesPolyfillPlugin()],
})
